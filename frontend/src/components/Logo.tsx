import { Box } from '@mui/material';

interface LogoProps {
  height?: number;
  light?: boolean;
}

export default function Logo({ height = 40, light = false }: LogoProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 240 64"
      sx={{ height, width: 'auto', display: 'block' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <circle cx="32" cy="32" r="30" fill={light ? 'rgba(255, 255, 255, 0.12)' : '#EAF7EF'} />
        <path
          d="M46 18c-14-2-24 4-25 16 0 2 .3 4 .8 5.5C25 31 30 26.5 36 24.5c-5 3.2-9.8 8.3-12 16.5 2 .9 4.6 1.3 7 1 14-1.4 17-13 15-24z"
          fill="#23A455"
        />
        <path
          d="M36 24.5C30 26.5 25 31 21.8 39.5c2.4 1.6 4 4.3 4.4 7h12c-1-11 0-16.5-2.2-22z"
          fill="#2DBB67"
        />
      </g>
      <text
        x="72"
        y="41"
        fontFamily="Inter, Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
        fontSize="26"
        fontWeight="800"
      >
        <tspan fill={light ? '#FFFFFF' : '#123A52'}>JM</tspan>
        <tspan fill="#2DBB67">Feeds</tspan>
      </text>
    </Box>
  );
}
