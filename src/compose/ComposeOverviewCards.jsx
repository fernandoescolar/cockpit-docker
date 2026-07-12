import React from 'react';
import { Badge } from "@patternfly/react-core/dist/esm/components/Badge";
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "@patternfly/react-core/dist/esm/components/Card";
import { Grid, GridItem } from "@patternfly/react-core/dist/esm/layouts/Grid";
import { CheckCircleIcon, ExclamationTriangleIcon, PauseCircleIcon, UnknownIcon } from '@patternfly/react-icons/dist/esm/icons';
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

function statusVisual(status) {
    if (status === "running") {
        return {
            Icon: CheckCircleIcon,
            className: "ct-compose-status-running",
            text: _("Healthy running stack"),
        };
    }

    if (status === "degraded") {
        return {
            Icon: ExclamationTriangleIcon,
            className: "ct-compose-status-degraded",
            text: _("Running with degraded service health"),
        };
    }

    if (status === "stopped") {
        return {
            Icon: PauseCircleIcon,
            className: "ct-compose-status-stopped",
            text: _("Stack is currently stopped"),
        };
    }

    return {
        Icon: UnknownIcon,
        className: "ct-compose-status-unknown",
        text: _("Current state is unknown"),
    };
}

const ComposeOverviewCards = ({
    projects,
    selectedProject,
    isRunningAction,
    onSelectProject,
    onStart,
    onStop,
    onRestart,
    onPull,
    onUpdate,
    onOpenDetail,
    onOpenEditor,
}) => {
    if (!projects?.length)
        return <small className="ct-grey-text">{_("No compose stacks available.")}</small>;

    return (
        <Grid hasGutter className="ct-compose-overview-grid">
            {projects.map(project => {
                const isSelected = selectedProject?.id === project.id;
                const stopped = Math.max((project.total || 0) - (project.running || 0), 0);
                const status = statusVisual(project.status);
                return (
                    <GridItem key={project.id} md={6} lg={4}>
                        <Card isCompact className={isSelected ? "ct-compose-overview-card pf-m-selected" : "ct-compose-overview-card"}>
                            <CardHeader actions={{ actions: statusBadge(project.status) }}>
                                <CardTitle>{project.name}</CardTitle>
                            </CardHeader>
                            <CardBody>
                                <div className={`ct-compose-status-line ${status.className}`}>
                                    <status.Icon />
                                    <span>{status.text}</span>
                                </div>
                                <div className="ct-compose-metrics">
                                    <div className="ct-compose-metric"><strong>{project.running || 0}</strong><small>{_("Running")}</small></div>
                                    <div className="ct-compose-metric"><strong>{stopped}</strong><small>{_("Stopped")}</small></div>
                                    <div className="ct-compose-metric"><strong>{project.total || 0}</strong><small>{_("Services")}</small></div>
                                    <div className="ct-compose-metric"><strong>{project.composeFiles?.length || 0}</strong><small>{_("Files")}</small></div>
                                </div>
                                <small className="ct-grey-text">{project.composeFiles?.join(", ")}</small>
                            </CardBody>
                            <CardFooter>
                                <div className="ct-compose-overview-actions">
                                    <div className="ct-compose-overview-actions-primary">
                                        <Button size="sm" isDisabled={isRunningAction || project.status === "running"} onClick={() => onStart(project)}>{_("Start")}</Button>
                                        <Button size="sm" variant="secondary" isDisabled={isRunningAction || project.status === "stopped"} onClick={() => onStop(project)}>{_("Stop")}</Button>
                                        <Button size="sm" variant="secondary" isDisabled={isRunningAction} onClick={() => onRestart(project)}>{_("Restart")}</Button>
                                    </div>
                                    <div className="ct-compose-overview-actions-secondary">
                                        <Button size="sm" variant="secondary" isDisabled={isRunningAction} onClick={() => onPull(project)}>{_("Pull")}</Button>
                                        <Button size="sm" variant="secondary" isDisabled={isRunningAction} onClick={() => onUpdate(project)}>{_("Update")}</Button>
                                        <Button size="sm" variant="link" onClick={() => onOpenDetail(project)}>{_("Detail")}</Button>
                                        <Button size="sm" variant="link" onClick={() => onOpenEditor(project)}>{_("Editor")}</Button>
                                        <Button size="sm" variant="link" onClick={() => onSelectProject(project.id)}>{_("Select")}</Button>
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    </GridItem>
                );
            })}
        </Grid>
    );
};

export default ComposeOverviewCards;
