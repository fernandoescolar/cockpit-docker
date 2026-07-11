# cockpit-docker

This is the [Cockpit](https://cockpit-project.org/) user interface for [docker
containers](https://docker.io/). 

## Technologies

 - cockpit-docker communicates to docker through its [REST API](https://docs.docker.com/engine/api/v1.43/).

 - Compose management is implemented through the local CLI (`docker compose` with fallback to `podman compose`) for stack lifecycle operations and file workflows.

 - This project is based on [cockpit-podman](https://github.com/cockpit-project/cockpit-podman), I ported as much as I could to the docker API, but not everything maps (e.g. pods) and not everything is ported yet.

## Compose management (MVP)

cockpit-docker now includes a Compose tab in the main page, so you can switch between:

 - Containers view (existing Images + Containers cards)
 - Compose view (stack list + editor + controls)

Current Compose features:

 - Discover compose stacks under a configurable root path (default: `/etc/docker/compose`)
 - Show stack status (`running`, `degraded`, `stopped`, `unknown`) and running service counters
 - Advanced stack operations: create, delete, duplicate, rename, import (file/content), deploy from Git
 - Multiple compose file support per stack (including override-style workflows)
 - Read and edit compose files directly from the UI
 - Monaco-powered YAML editor for compose files
 - `.env` editor per stack for variable management
 - Built-in stack templates for quick bootstrap
 - Secrets as `KEY=VALUE` entries injected into compose command environments
 - Diff preview before applying compose changes
 - Local history snapshots with restore for compose file versioning
 - Save compose files
 - Run lifecycle actions: `Up`, `Stop`, `Down`, `Restart`, `Pull`, `Update` (`pull` + `up -d`), `Recreate`
 - Service-level operations: restart and scale
 - Service observability: status list, health/error details, logs (auto-refresh), and inspect view

Operational notes:

 - Compose operations require elevated privileges in Cockpit.
 - Stack actions and file editing use a Monaco-based editor in the UI.
 - The selected top-level view is reflected in URL options through `view=compose`.

# Development dependencies

On Debian/Ubuntu:

    $ sudo apt install gettext nodejs make

On Fedora:

    $ sudo dnf install gettext nodejs make

# Getting and building the source

These commands check out the source and build it into the `dist/` directory:

```
git clone https://github.com/cockpit-docker/cockpit-docker
cd cockpit-docker
make
```

# Installing

`sudo make install` installs the package in `/usr/local/share/cockpit/`. This depends
on the `dist` target, which generates the distribution tarball.

You can also run `make rpm` to build RPMs for local installation.

In `production` mode, source files are automatically minified and compressed.
Set `NODE_ENV=production` if you want to duplicate this behavior.

## Arch Derivatives
[AUR package](https://aur.archlinux.org/packages/cockpit-docker)

`yay -Ss cockpit-docker`

OR for Manjaro 

`pamac install cockpit-docker`

# Development instructions

See [HACKING.md](./HACKING.md) for details about how to efficiently change the
code, run, and test it.

# Automated release

The intention is that the only manual step for releasing a project is to create
a signed tag for the version number, which includes a summary of the noteworthy
changes:

```
123

- this new feature
- fix bug #123
```

Pushing the release tag triggers the [release.yml](.github/workflows/release.yml)
[GitHub action](https://github.com/features/actions) workflow. This creates the
official release tarball and publishes as upstream release to GitHub.

The Fedora and COPR releases are done with [Packit](https://packit.dev/),
see the [packit.yaml](./packit.yaml) control file.

# Automated maintenance

It is important to keep your [NPM modules](./package.json) up to date, to keep
up with security updates and bug fixes. This happens with
[dependabot](https://github.com/dependabot),
see [configuration file](.github/dependabot.yml).

Translations are refreshed every Tuesday evening (or manually) through the
[weblate-sync-po.yml](.github/workflows/weblate-sync-po.yml) action.
Conversely, the PO template is uploaded to weblate every day through the
[weblate-sync-pot.yml](.github/workflows/weblate-sync-pot.yml) action.
