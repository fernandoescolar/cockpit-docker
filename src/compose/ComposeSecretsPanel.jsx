import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form";
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const ComposeSecretsPanel = ({
    actionSecretsText,
    onActionSecretsTextChange,
    secretPassphrase,
    onSecretPassphraseChange,
    secretStorageBusy,
    hasSecretsOnDisk,
    onSaveSecrets,
    onUnlockSecrets,
    onDeleteSecrets,
}) => {
    return (
        <FormGroup fieldId="compose-secret-env" label={_("Secret environment variables injected into compose commands")}
                   helperText={_("One KEY=VALUE per line. Secrets are encrypted with your passphrase and persisted in a per-stack file on disk.")}>
            <TextArea id="compose-secret-env" rows={4} value={actionSecretsText} onChange={(_, value) => onActionSecretsTextChange(value)} />
            <Split hasGutter>
                <SplitItem isFilled>
                    <TextInput type="password"
                               value={secretPassphrase}
                               placeholder={_("Passphrase for secret encryption")}
                               onChange={(_, value) => onSecretPassphraseChange(value)}
                               aria-label={_("Secrets passphrase")} />
                </SplitItem>
                <SplitItem>
                    <Button variant="secondary" isDisabled={secretStorageBusy || !secretPassphrase} onClick={onSaveSecrets}>
                        {_("Save encrypted")}
                    </Button>
                </SplitItem>
                <SplitItem>
                    <Button variant="secondary" isDisabled={secretStorageBusy || !secretPassphrase || !hasSecretsOnDisk} onClick={onUnlockSecrets}>
                        {_("Unlock")}
                    </Button>
                </SplitItem>
                <SplitItem>
                    <Button variant="danger" isDisabled={secretStorageBusy || !hasSecretsOnDisk} onClick={onDeleteSecrets}>
                        {_("Delete stored")}
                    </Button>
                </SplitItem>
            </Split>
            <small>{hasSecretsOnDisk ? _("Encrypted secrets file is present for this stack.") : _("No encrypted secrets stored for this stack.")}</small>
        </FormGroup>
    );
};

export default ComposeSecretsPanel;
