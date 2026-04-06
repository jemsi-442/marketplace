import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at top left, rgba(251,191,36,0.98), rgba(217,119,6,1) 68%, rgba(120,53,15,1))',
          color: '#0f172a',
          fontFamily: 'sans-serif',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            width: 128,
            height: 128,
            borderRadius: 32,
            background: 'rgba(255,255,255,0.2)',
          }}
        >
          <div style={{ fontSize: 74, fontWeight: 900, lineHeight: 1 }}>W</div>
        </div>
      </div>
    ),
    size,
  );
}
