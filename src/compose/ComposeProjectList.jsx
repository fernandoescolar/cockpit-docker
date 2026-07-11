import React from 'react';
import { Badge } from "@patternfly/react-core/dist/esm/components/Badge";
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { EmptyState, EmptyStateBody, EmptyStateHeader, EmptyStateVariant } from "@patternfly/react-core/dist/esm/components/EmptyState";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

function statusBadge(status) {
    if (status === "running")
        return <Badge isRead className="ct-badge-container-running">{_("Running")}</Badge>;
    if (status === "degraded")
        return <Badge isRead className="ct-badge-container-unhealthy">{_("Degraded")}</Badge>;
    if (status === "stopped")
        return <Badge isRead className="ct-badge-container-stopped">{_("Stopped")}</Badge>;

    return <Badge isRead>{_("Unknown")}</Badge>;
}

const ComposeProjectList = ({ projects, selectedProject, onSelectProject }) => {
    if (projects === null)
        return <Spinner size="lg" />;

    if (projects.length === 0) {
        return (
            <EmptyState variant={EmptyStateVariant.sm}>
                <EmptyStateHeader titleText={_("No compose stacks found")} headingLevel="h3" />
                <EmptyStateBody>
                    {_("Create or import stacks under the compose root path.")}
                </EmptyStateBody>
            </EmptyState>
        );
    }

    return (
        <List isPlain>
            {projects.map(project => {
                const isSelected = selectedProject?.id === project.id;
                return (
                    <ListItem key={project.id}>
                        <Button variant={isSelected ? "secondary" : "link"} isBlock onClick={() => onSelectProject(project.id)}>
                            {project.name}
                        </Button>
                        <div>{statusBadge(project.status)} <small>{cockpit.format(_("$0/$1 services running"), project.running, project.total)}</small></div>
                        <small>{project.composeFiles?.join(", ")}</small>
                    </ListItem>
                );
            })}
        </List>
    );
};

export default ComposeProjectList;
