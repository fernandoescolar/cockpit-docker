import React from 'react';
import { Badge } from "@patternfly/react-core/dist/esm/components/Badge";
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
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
    const [filterText, setFilterText] = React.useState("");

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

    const filteredProjects = projects.filter(project => project.name.toLowerCase().includes(filterText.trim().toLowerCase()));

    return (
        <div className="ct-compose-project-list">
            <TextInput value={filterText}
                       onChange={(_event, value) => setFilterText(value)}
                       aria-label={_("Filter compose stacks")}
                       placeholder={_("Filter stacks")} />
            <List isPlain>
                {filteredProjects.map(project => {
                const isSelected = selectedProject?.id === project.id;
                return (
                        <ListItem key={project.id} className={isSelected ? "ct-compose-project-item pf-m-selected" : "ct-compose-project-item"}>
                            <Button variant="link" isInline onClick={() => onSelectProject(project.id)}>
                                <strong>{project.name}</strong>
                            </Button>
                            <div className="ct-compose-project-meta">
                                {statusBadge(project.status)}
                                <small>{cockpit.format(_("$0/$1 running"), project.running, project.total)}</small>
                            </div>
                            {isSelected && <small className="ct-grey-text">{project.composeFiles?.join(", ")}</small>}
                        </ListItem>
                );
                })}
            </List>
        </div>
    );
};

export default ComposeProjectList;
