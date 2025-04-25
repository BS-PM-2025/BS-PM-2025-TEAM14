import * as React from 'react';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';

export default function ScoreGauge({ scoreValue }) {
    const getGaugeColor = (value) => {
        if (value > 85) return '#4caf50'; // green
        if (value > 70) return '#ff9800'; // orange
        return '#f44336'; // red
    };

    const settings = {
        width: 200,
        height: 200,
        value: scoreValue,
    };

    const color = getGaugeColor(scoreValue);

    return (
        <Gauge
            {...settings}
            cornerRadius="50%"
            sx={(theme) => {
                const isDark = theme.palette.mode === 'dark';
                return {
                    [`& .${gaugeClasses.valueText}`]: {
                        fontSize: 40,
                        fill: isDark ? '#eee' : '#333',
                    },
                    [`& .${gaugeClasses.valueArc}`]: {
                        fill: color,
                    },
                    [`& .${gaugeClasses.referenceArc}`]: {
                        fill: isDark ? '#555' : theme.palette.text.disabled,
                    },
                };
            }}
        />
    );
}
