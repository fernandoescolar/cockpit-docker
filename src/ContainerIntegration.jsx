import React, { useState } from 'react';
import cockpit from 'cockpit';

import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm } from "@patternfly/react-core/dist/esm/components/DescriptionList";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List";
import { Tooltip } from "@patternfly/react-core/dist/esm/components/Tooltip";

import { EmptyStatePanel } from "cockpit-components-empty-state.jsx";

const _ = cockpit.gettext;

export const renderContainerPublishedPorts = (ports) => {
    if (!ports)
        return null;

    const result = ports.map(port => {
        // docker v4 has different names than v3
        const protocol = port.Type;
        const hostPort = port.PublicPort;
        const containerPort = port.PrivatePort;
        const hostIp = port.IP || '0.0.0.0';

        return (
            <ListItem key={ protocol + hostIp + hostPort + containerPort }>
                { hostIp }:{ hostPort } &rarr; { containerPort }/{ protocol }
            </ListItem>
        );
    });

    return <List isPlain>{result}</List>;
};

export const renderContainerVolumes = (volumes) => {
    if (!volumes.length)
        return null;

    const result = volumes.map(volume => {
        return (
            <ListItem key={volume.Source + volume.Destination}>
                {volume.Source}
                {volume.RW
                    ? <Tooltip content={_("Read-write access")}><span> &harr; </span></Tooltip>
                    : <Tooltip content={_("Read-only access")}><span> &rarr; </span></Tooltip>}
                {volume.Destination}
            </ListItem>
        );
    });

    return <List isPlain>{result}</List>;
};

const ContainerEnv = ({ containerEnv, imageEnv }) => {
    // filter out some Environment variables set by docker or by image
    const toRemoveEnv = [...imageEnv, 'container=docker'];
    let toShow = containerEnv.filter(variable => {
        if (toRemoveEnv.includes(variable)) {
            return false;
        }

        return !variable.match(/(HOME|TERM)=.*/);
    });

    // append filtered out variables to always shown variables when 'show more' is clicked
    const [showMore, setShowMore] = useState(false);
    if (showMore)
        toShow = toShow.concat(containerEnv.filter(variable => !toShow.includes(variable)));

    if (!toShow.length)
        return null;

    const result = toShow.map(variable => {
        return (
            <ListItem key={variable}>
                {variable}
            </ListItem>
        );
    });

    result.push(
        <ListItem key='show-more-env-button'>
            <Button variant='link' isInline
                onClick={() => setShowMore(!showMore)}>
                {showMore ? _("Show less") : _("Show more")}
            </Button>
        </ListItem>
    );

    return <List isPlain>{result}</List>;
};

const ContainerIntegration = ({ container, containerDetail, localImages }) => {
    if (containerDetail === null || localImages === null) {
        return (
            <EmptyStatePanel title={_("Loading details...")} loading />
        );
    }

    const ports = renderContainerPublishedPorts(container.Ports);
    const volumes = renderContainerVolumes(containerDetail.Mounts);

    const image = localImages.filter(img => img.Id === container.ImageID)[0];
    const env = <ContainerEnv containerEnv={containerDetail.Config.Env} imageEnv={image ? image.Env : []} />;

    return (
        <DescriptionList isAutoColumnWidths columnModifier={{ md: '3Col' }} className='container-integration'>
            {ports && <DescriptionListGroup>
                <DescriptionListTerm>{_("Ports")}</DescriptionListTerm>
                <DescriptionListDescription>{ports}</DescriptionListDescription>
            </DescriptionListGroup>}
            {volumes && <DescriptionListGroup>
                <DescriptionListTerm>{_("Volumes")}</DescriptionListTerm>
                <DescriptionListDescription>{volumes}</DescriptionListDescription>
            </DescriptionListGroup>}
            {env && <DescriptionListGroup>
                <DescriptionListTerm>{_("Environment variables")}</DescriptionListTerm>
                <DescriptionListDescription>{env}</DescriptionListDescription>
            </DescriptionListGroup>}
        </DescriptionList>
    );
};

export default ContainerIntegration;
