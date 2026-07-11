import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { ExpandableSection } from "@patternfly/react-core/dist/esm/components/ExpandableSection";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List";
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const ComposeServicesTab = ({
    selectedService,
    onSelectedServiceChange,
    services,
    isRunningAction,
    onRunServiceRestart,
    serviceScale,
    onServiceScaleChange,
    onRunServiceScale,
    serviceContainers,
    serviceLogs,
    serviceInspect,
}) => {
    const [isLogsExpanded, setIsLogsExpanded] = React.useState(true);
    const [isInspectExpanded, setIsInspectExpanded] = React.useState(false);

    if (services.length === 0) {
        return <small className="ct-grey-text">{_("No services found for this stack yet.")}</small>;
    }

    return (
        <Split hasGutter>
            <SplitItem isFilled>
                <FormGroup fieldId="compose-service-select" label={_("Service state")}
                           helperText={_("Observe status, health, recent errors, logs, and inspect")}>
                    <FormSelect value={selectedService} onChange={(_, value) => onSelectedServiceChange(value)}>
                        {services.map(service => (
                            <FormSelectOption key={service.name} value={service.name}
                                              label={`${service.name} (${service.status})`} />
                        ))}
                    </FormSelect>
                    <Split hasGutter>
                        <SplitItem>
                            <Button variant="secondary" isDisabled={!selectedService || isRunningAction} onClick={onRunServiceRestart}>{_("Restart service")}</Button>
                        </SplitItem>
                        <SplitItem isFilled>
                            <TextInput value={serviceScale} onChange={(_, value) => onServiceScaleChange(value)} aria-label={_("Service scale")} />
                        </SplitItem>
                        <SplitItem>
                            <Button variant="secondary" isDisabled={!selectedService || isRunningAction} onClick={onRunServiceScale}>{_("Scale")}</Button>
                        </SplitItem>
                    </Split>
                </FormGroup>

                <FormGroup fieldId="compose-service-health" label={_("Containers and health")}>
                    <List isPlain>
                        {serviceContainers.map(container => (
                            <ListItem key={container.id}>
                                <b>{container.name}</b> - {container.status} / {container.health}
                                {container.error ? <div>{container.error}</div> : null}
                            </ListItem>
                        ))}
                    </List>
                </FormGroup>
            </SplitItem>

            <SplitItem isFilled>
                <ExpandableSection toggleText={_("Logs (auto-refresh)")}
                                   isExpanded={isLogsExpanded}
                                   onToggle={(_event, expanded) => setIsLogsExpanded(expanded)}>
                    <FormGroup fieldId="compose-service-logs">
                        <TextArea value={serviceLogs}
                                  rows={10}
                                  resizeOrientation="vertical"
                                  readOnly />
                    </FormGroup>
                </ExpandableSection>

                <ExpandableSection toggleText={_("Inspect")}
                                   isExpanded={isInspectExpanded}
                                   onToggle={(_event, expanded) => setIsInspectExpanded(expanded)}>
                    <FormGroup fieldId="compose-service-inspect">
                        <TextArea value={serviceInspect}
                                  rows={10}
                                  resizeOrientation="vertical"
                                  readOnly />
                    </FormGroup>
                </ExpandableSection>
            </SplitItem>
        </Split>
    );
};

export default ComposeServicesTab;
