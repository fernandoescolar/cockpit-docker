import React from 'react';
import cockpit from 'cockpit';
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar";
const _ = cockpit.gettext;

const ContainerHeader = ({ textFilter, handleFilterChanged }) => {
    return (
        <Toolbar className="pf-m-page-insets" style={{ display: 'none' }}>
            <ToolbarContent>
                <ToolbarItem>
                    <TextInput id="containers-filter"
                                   placeholder={_("Type to filter…")}
                                   value={textFilter}
                                   onChange={(_, value) => handleFilterChanged(value)} />
                </ToolbarItem>
            </ToolbarContent>
        </Toolbar>
    );
};

export default ContainerHeader;
