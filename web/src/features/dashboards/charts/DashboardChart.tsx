import { useContext, useEffect, useRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';
import type { EChartsOption } from 'echarts';

import { ChartThemeContext } from './theme';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export function DashboardChart({ label, option }: { label: string; option: EChartsOption }) {
  const dark = useContext(ChartThemeContext);
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height && chart.current && !chart.current.isDisposed()) {
        chart.current.resize({ width, height });
      }
    });
    observer.observe(container.current!);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="dashboard-chart-renderer" ref={container} role="img" aria-label={label}>
      <ReactEChartsCore
        echarts={echarts}
        theme={dark ? 'dark' : undefined}
        option={{ ...option, backgroundColor: 'transparent' }}
        style={{ width: '100%', height: '100%' }}
        autoResize={false}
        notMerge
        onChartReady={(instance: EChartsType) => {
          chart.current = instance;
          instance.resize();
        }}
      />
    </div>
  );
}
