import _ from 'lodash';
import Graph from 'graphology';
import { buildName } from '$lib/transformers/build-name';
import { YELLOW, GREEN, BLUE, PURPLE, MAGENTA, CYAN, WHITE, RED, NAVY } from '$lib/constants';
import type { EAV } from '$lib/types';

const ECR = [
  'Maritime and port issues',
  'The city of tomorrow: architecture, urban planning, sustainable construction and design',
  'Transitions, risks and hazards',
];

const HUBS = [
  'Identities, Local Knowledge, and Cultural Heritage in Islands & Coastal Communities',
  'Blue Circular Economy, Port Logistics, and Sustainable Blue Tourism',
  'Governance, Planning, Management, and Monitoring of Islands and Coastal Communities',
  'Health, Biodiversity Protection, Nature-based Solutions, and Sustainable Exploration of Coastal/Marine Resources',
  'Engineered and Data-driven Solutions for Coastal Infrastructures, Marine Renewable Energy, Marine Safety, and Navigation Systems',
];

export const generateGraph = (data: EAV[], circleSize = 10, edgeSize = 2): Graph => {
  const graph = new Graph({ type: 'directed', multi: false, allowSelfLoops: false });

  graph.addNode('cptmp', {
    type: 'image',
    size: circleSize * 3,
    label: 'Campus polytechnique des territoires maritimes et portuaires',
    color: WHITE,
    image: '/cptmp-big.png',
  });
  ECR.forEach((ecr) => {
    graph.addNode(ecr, {
      type: 'border',
      size: circleSize,
      label: ecr,
      color: WHITE,
      borderColor: RED,
      borderSize: 0.5,
    });
    graph.addEdge('cptmp', ecr, { size: edgeSize, type: 'arrow' });
  });
  graph.addNode('eunicoast', {
    type: 'image',
    size: circleSize * 3,
    color: WHITE,
    label: 'EUNICoast',
    image: '/eunicoast-logo-only-big.png',
  });
  HUBS.forEach((hub) => {
    graph.addNode(hub, {
      type: 'border',
      size: circleSize,
      label: hub,
      color: WHITE,
      borderColor: NAVY,
      borderSize: 0.5,
    });
    graph.addEdge('eunicoast', hub, { size: edgeSize, type: 'arrow' });
  });

  const userIds: string[] = _.chain(data)
    .map((item) => item.record)
    .uniq()
    .value();

  for (const userId of userIds) {
    const isActive =
      data.length > 0 &&
      data.filter(
        (item) => item.record === userId && item.field_name === 'active' && item.value === 'Yes'
      ).length > 0;
    if (!isActive) continue;

    // Build and add the user node
    const nameData: EAV[] = _.chain(data)
      .filter(
        (item) =>
          item.record === userId &&
          ['first_name', 'middle_name', 'last_name'].includes(item.field_name)
      )
      .value();
    const name = buildName(nameData);
    graph.addNode(userId, { type: 'circle', size: circleSize, label: name, color: YELLOW });

    const projectIds = _.chain(data)
      .filter(
        (item) =>
          item.record === userId &&
          item.redcap_repeat_instrument === 'Your Upcoming Project' &&
          item.redcap_repeat_instance !== ''
      )
      .map((item) => item.redcap_repeat_instance)
      .uniq()
      .value();
    console.log('projectIds', projectIds);
    for (const projectId of projectIds) {
      const label = data.filter(
        (item) =>
          item.record === userId &&
          item.redcap_repeat_instrument === 'Your Upcoming Project' &&
          item.redcap_repeat_instance === projectId &&
          item.field_name === 'acronym'
      )[0].value;
      const projectAcronym: string = `${userId}|${label}`;

      // Add the project node and the edge between the user and the project
      graph.addNode(projectAcronym, { type: 'circle', size: circleSize, label, color: GREEN });
      graph.addEdge(userId, projectAcronym, { size: edgeSize, type: 'arrow' });
      // Add the edges between the project and the ECRs
      data
        .filter(
          (item) =>
            item.record === userId &&
            item.redcap_repeat_instrument === 'Your Upcoming Project' &&
            item.redcap_repeat_instance === projectId &&
            item.field_name === 'ecr'
        )
        .map((item) => item.value)
        .forEach((ecr) => {
          graph.addEdge(ecr, projectAcronym, { size: edgeSize, type: 'arrow' });
        });
      // Add the edges between the project and the HUBs
      data
        .filter(
          (item) =>
            item.record === userId &&
            item.redcap_repeat_instrument === 'Your Upcoming Project' &&
            item.redcap_repeat_instance === projectId &&
            item.field_name === 'eunicoast'
        )
        .map((item) => item.value)
        .forEach((hub) => {
          graph.addEdge(hub, projectAcronym, { size: edgeSize, type: 'arrow' });
        });

      // Add the topic
      const topic = data.filter(
        (item) =>
          item.record === userId &&
          item.redcap_repeat_instrument === 'Your Upcoming Project' &&
          item.redcap_repeat_instance === projectId &&
          item.field_name === 'topic'
      )[0].value;
      if (!graph.hasNode(topic))
        graph.addNode(topic, { type: 'circle', size: circleSize, label: topic, color: BLUE });
      graph.addEdge(projectAcronym, topic, { size: edgeSize, type: 'arrow' });
      // Add the keywords
      data
        .filter(
          (item) =>
            item.record === userId &&
            item.redcap_repeat_instrument === 'Your Upcoming Project' &&
            item.redcap_repeat_instance === projectId &&
            item.field_name.match(/^topic_keyword/)
        )
        .map((item) => item.value)
        .forEach((kw) => {
          if (!graph.hasNode(kw))
            graph.addNode(kw, { type: 'circle', size: circleSize, label: kw, color: PURPLE });
          graph.addEdge(kw, topic, { size: edgeSize, type: 'arrow' });
        });

      // Add the methods
      data
        .filter(
          (item) =>
            item.record === userId &&
            item.redcap_repeat_instrument === 'Your Upcoming Project' &&
            item.redcap_repeat_instance === projectId &&
            item.field_name.match(/^method\d$/)
        )
        .map((item) => item.value)
        .forEach((method) => {
          if (!graph.hasNode(method))
            graph.addNode(method, {
              type: 'circle',
              size: circleSize,
              label: method,
              color: MAGENTA,
            });
          graph.addEdge(method, projectAcronym, { size: edgeSize, type: 'arrow' });
        });

      // Add the zone
      data
        .filter(
          (item) =>
            item.record === userId &&
            item.redcap_repeat_instrument === 'Your Upcoming Project' &&
            item.redcap_repeat_instance === projectId &&
            item.field_name.match(/^zone\d$/)
        )
        .map((item) => item.value)
        .forEach((zone) => {
          if (!graph.hasNode(zone))
            graph.addNode(zone, { type: 'circle', size: circleSize, label: zone, color: CYAN });
          graph.addEdge(zone, projectAcronym, { size: edgeSize, type: 'arrow' });
        });
    }
  }

  return graph;
};
