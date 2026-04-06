import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
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
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 32,
            borderRadius: 116,
            border: '10px solid rgba(255,255,255,0.35)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 8,
            padding: '40px 56px',
            borderRadius: 96,
            background: 'rgba(255,255,255,0.18)',
            boxShadow: '0 18px 54px rgba(15,23,42,0.22)',
          }}
        >
          <div style={{ fontSize: 78, fontWeight: 900, letterSpacing: -4 }}>W</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 8 }}>WOLFIX</div>
        </div>
      </div>
    ),
    size,
  );
}
