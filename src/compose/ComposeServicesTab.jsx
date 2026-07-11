import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List";
import { CodeEditor } from "@patternfly/react-code-editor";
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split";
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
                <FormGroup fieldId="compose-service-logs" label={_("Logs (auto-refresh)")}>
                    <CodeEditor isReadOnly language="shell" code={serviceLogs} height="22vh" />
                </FormGroup>
                <FormGroup fieldId="compose-service-inspect" label={_("Inspect")}>
                    <CodeEditor isReadOnly language="json" code={serviceInspect} height="22vh" />
                </FormGroup>
            </SplitItem>
        </Split>
    );
};

export default ComposeServicesTab;
