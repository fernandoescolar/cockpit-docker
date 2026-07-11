import cockpit from 'cockpit';

const SECRET_FILE_NAME = ".cockpit-compose-secrets.enc.json";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function fromBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function secretFilePath(projectDirectory) {
    return `${projectDirectory}/${SECRET_FILE_NAME}`;
}

async function deriveKey(passphrase, salt) {
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 250000,
            hash: "SHA-256",
        },
        keyMaterial,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encryptSecretBundle(plaintext, passphrase) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoder.encode(plaintext)
    );

    return {
        version: 1,
        algorithm: "AES-GCM",
        kdf: "PBKDF2-SHA256",
        iterations: 250000,
        salt: toBase64(salt),
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(ciphertext)),
        updatedAt: new Date().toISOString(),
    };
}

export async function decryptSecretBundle(bundle, passphrase) {
    const salt = fromBase64(bundle.salt);
    const iv = fromBase64(bundle.iv);
    const ciphertext = fromBase64(bundle.ciphertext);

    const key = await deriveKey(passphrase, salt);
    const plaintext = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
    );

    return decoder.decode(plaintext);
}

export async function saveEncryptedSecrets(projectDirectory, plaintextSecrets, passphrase) {
    const encryptedBundle = await encryptSecretBundle(plaintextSecrets, passphrase);
    const file = cockpit.file(secretFilePath(projectDirectory), { superuser: "require" });
    await file.replace(JSON.stringify(encryptedBundle, null, 2));
}

export async function loadEncryptedSecrets(projectDirectory, passphrase) {
    const file = cockpit.file(secretFilePath(projectDirectory), { superuser: "require" });
    const raw = await file.read();
    if (!raw)
        return "";

    const bundle = JSON.parse(raw);
    return decryptSecretBundle(bundle, passphrase);
}

export async function hasEncryptedSecrets(projectDirectory) {
    const file = cockpit.file(secretFilePath(projectDirectory), { superuser: "require" });
    try {
        const raw = await file.read();
        return !!raw;
    } catch {
        return false;
    }
}

export async function deleteEncryptedSecrets(projectDirectory) {
    await cockpit.spawn(["rm", "-f", secretFilePath(projectDirectory)], {
        superuser: "require",
        err: "ignore",
        environ: ["LC_ALL=C"],
    });
}
