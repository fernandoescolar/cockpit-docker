import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List";
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const ComposeHistoryTab = ({ historyFiles, onRefreshHistory, onRestoreHistory }) => {
    return (
        <>
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem><Button variant="secondary" onClick={onRefreshHistory}>{_("Reload history")}</Button></ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <List isPlain>
                {historyFiles.map(path => (
                    <ListItem key={path}>
                        <Split hasGutter>
                            <SplitItem isFilled><small>{path}</small></SplitItem>
                            <SplitItem><Button variant="secondary" onClick={() => onRestoreHistory(path)}>{_("Restore")}</Button></SplitItem>
                        </Split>
                    </ListItem>
                ))}
            </List>
        </>
    );
};

export default ComposeHistoryTab;
