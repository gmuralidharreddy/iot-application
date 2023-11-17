import { DashboardDefinition } from '../../dashboards/entities/dashboard-definition.entity';
import {
  DashboardWidget,
  DashboardWidgetType,
} from '../../dashboards/entities/dashboard-widget.entity';
import {
  MonitorWidgetType,
  MonitorMetric,
  SiteWiseMonitorDashboardDefinition,
  MonitorAnnotations,
} from './monitor-dashboard-definition';
import { nanoid } from 'nanoid';
import { colorPalette } from '../util/colorPalette';
import { randomUUID } from 'crypto';

interface ApplicationProperty {
  propertyId: string;
  aggregationType?: string;
  resolution?: string;
  refId?: string;
}

interface ApplicationAsset {
  assetId: string;
  properties: ApplicationProperty[];
}

interface ApplicationQuery {
  properties: string[];
  assets: ApplicationAsset[];
}

interface ApplicationQueryConfig {
  source: string;
  query: ApplicationQuery;
}

interface QueryConfig {
  queryConfig: ApplicationQueryConfig;
}

const defaultResolution = '1m';
const defaultAggregationType = 'AVERAGE';

/**
 * Default Monitor size is 3x3 squares
 * A similar sized application dashboard is 99x42 cells
 */
const appCellsPerMonitorSquareWidth = 33; // 99 / 3
const appCellPerMonitorSquareHeight = 14; // 42 / 3

const convertType = (monitorChartType: string) => {
  switch (monitorChartType) {
    case MonitorWidgetType.LineChart:
      return DashboardWidgetType.XYPlot;
    case MonitorWidgetType.BarChart:
      return DashboardWidgetType.BarChart;
    case MonitorWidgetType.ScatterChart:
      return DashboardWidgetType.XYPlot;
    case MonitorWidgetType.StatusTimeline:
      return DashboardWidgetType.StatusTimeline;
    case MonitorWidgetType.Table:
      return DashboardWidgetType.Table;
    default:
      return DashboardWidgetType.XYPlot;
  }
};

const convertHeight = (height: number) => {
  return height * appCellPerMonitorSquareHeight;
};

const convertWidth = (width: number) => {
  return width * appCellsPerMonitorSquareWidth;
};

const convertX = (x: number) => {
  return x * appCellsPerMonitorSquareWidth;
};

const convertY = (y: number) => {
  return y * appCellPerMonitorSquareHeight;
};

const convertResolution = (
  widgetType: MonitorWidgetType,
  resolution?: string,
) => {
  if (
    widgetType === MonitorWidgetType.StatusTimeline ||
    widgetType === MonitorWidgetType.Table
  ) {
    // Timeline has resolution set to 0
    return '0';
  }

  if (resolution) {
    if (resolution === 'raw') {
      return defaultResolution;
    }
    return resolution;
  }
  return defaultResolution;
};

const convertThresholds = (monitorAnnotations?: MonitorAnnotations) => {
  // Annotations are only added to the y axis array in Monitor
  if (monitorAnnotations?.y) {
    const applicationThresholds = [];
    for (const annotation of monitorAnnotations.y) {
      const newThreshold = {
        id: nanoid(12),
        visible: annotation.showValue,
        color: annotation.color,
        value: annotation.value,
        comparisonOperator: annotation.comparisonOperator,
      };
      applicationThresholds.push(newThreshold);
    }

    if (applicationThresholds.length !== 0) {
      return { thresholds: applicationThresholds };
    }
  }
  return undefined;
};

const defaultProperties = {
  aggregationType: defaultAggregationType,
};

const barChartProperties = {
  ...defaultProperties,
  axis: {
    showY: true,
    showX: true,
  },
};

const lineChartProperties = {
  ...defaultProperties,
  axis: {
    yVisible: true,
    xVisible: true,
  },
  symbol: {
    style: 'filled-circle',
  },
  line: {
    connectionStyle: 'linear',
    style: 'solid',
  },
  legend: {
    visible: true,
  },
};

const scatterChartProperties = {
  ...defaultProperties,
  axis: {
    yVisible: true,
    xVisible: true,
  },
  symbol: {
    style: 'filled-circle',
  },
  line: {
    connectionStyle: 'none',
    style: 'solid',
  },
  legend: {
    visible: true,
  },
};

const timelineProperties = {
  axis: {
    showY: true,
    showX: true,
  },
};

const getStaticProperties = (widgetType: MonitorWidgetType) => {
  switch (widgetType) {
    case MonitorWidgetType.LineChart:
      return lineChartProperties;
    case MonitorWidgetType.BarChart:
      return barChartProperties;
    case MonitorWidgetType.ScatterChart:
      return scatterChartProperties;
    case MonitorWidgetType.StatusTimeline:
      return timelineProperties;
    case MonitorWidgetType.Table:
      return {};
    default:
      return lineChartProperties;
  }
};

const getProperty = (metric: MonitorMetric, widgetType: MonitorWidgetType) => {
  let property: ApplicationProperty = {
    aggregationType: defaultAggregationType, // Monitor has no aggregationType and appliation defaults to AVERAGE
    propertyId: metric.propertyId,
    resolution: convertResolution(widgetType, metric.resolution),
  };

  if (
    widgetType === MonitorWidgetType.BarChart ||
    widgetType === MonitorWidgetType.StatusTimeline ||
    widgetType === MonitorWidgetType.Table
  ) {
    const refId = randomUUID();
    property = {
      ...property,
      refId,
    };
  }
  return property;
};

type AssetMap = Record<string, ApplicationProperty[]>;

const convertMetricsToQueryConfig = (
  monitorMetrics: MonitorMetric[],
  widgetType: MonitorWidgetType,
) => {
  const assetMap: AssetMap = {};
  const refIds = [];

  for (const metric of monitorMetrics) {
    const property = getProperty(metric, widgetType);

    let newProperties = [property];
    const existingAssetIds = Object.keys(assetMap);

    if (existingAssetIds.includes(metric.assetId)) {
      const existingProperties = assetMap[metric.assetId];
      if (existingProperties) {
        newProperties = [...existingProperties, property];
      }
    }

    // Map each assetId to the array of associated properties
    assetMap[metric.assetId] = newProperties;

    if (property.refId) {
      refIds.push(property.refId);
    }
  }

  const assets = [];
  const assetIds = Object.keys(assetMap);
  for (const assetId of assetIds) {
    const properties = assetMap[assetId];
    if (properties) {
      assets.push({ assetId, properties });
    }
  }

  const queryConfig: QueryConfig = {
    queryConfig: {
      source: 'iotsitewise',
      query: {
        properties: [],
        assets,
      },
    },
  };

  return { queryConfig, refIds };
};

const getStyleSettings = (widgetType: MonitorWidgetType, refIds: string[]) => {
  let styleSettings = {};
  if (
    widgetType === MonitorWidgetType.BarChart ||
    widgetType === MonitorWidgetType.StatusTimeline ||
    widgetType === MonitorWidgetType.Table
  ) {
    for (const [index, refId] of refIds.entries()) {
      styleSettings = {
        ...styleSettings,
        [refId]: {
          color: colorPalette[index],
        },
      };
    }
    return { styleSettings };
  }
  return undefined;
};

const convertProperties = (
  widgetType: MonitorWidgetType,
  monitorMetrics?: MonitorMetric[],
  monitorAnnotations?: MonitorAnnotations,
  monitorTitle?: string,
) => {
  if (monitorMetrics) {
    const staticProperties = getStaticProperties(widgetType);
    const { queryConfig, refIds } = convertMetricsToQueryConfig(
      monitorMetrics,
      widgetType,
    );
    const thresholds = convertThresholds(monitorAnnotations);
    const styleSettings = getStyleSettings(widgetType, refIds);

    return {
      ...staticProperties,
      ...queryConfig,
      ...thresholds,
      ...styleSettings,
      title: monitorTitle,
    };
  }
  return getStaticProperties(widgetType);
};

export const convertMonitorToAppDefinition = (
  monitorDashboardDefinition: SiteWiseMonitorDashboardDefinition,
): DashboardDefinition => {
  const newDashboardDefinition: DashboardDefinition = { widgets: [] };

  if (monitorDashboardDefinition.widgets) {
    for (const [
      index,
      widget,
    ] of monitorDashboardDefinition.widgets.entries()) {
      const newAppWidget: DashboardWidget = {
        type: convertType(widget.type),
        id: nanoid(12),
        x: convertX(widget.x),
        y: convertY(widget.y),
        z: index, // Stack widgets in case of overlap
        width: convertWidth(widget.width),
        height: convertHeight(widget.height),
        properties: convertProperties(
          widget.type,
          widget.metrics,
          widget.annotations,
          widget.title,
        ),
      };

      newDashboardDefinition.widgets.push(newAppWidget);
    }
  }

  return newDashboardDefinition;
};