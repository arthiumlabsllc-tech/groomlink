// Payment provider logos — official brand artwork served from /public

export function MTNLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/mtn-momo.png"
      alt="MTN Mobile Money"
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function VodafoneLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/telecel-cash.png"
      alt="Telecel Cash"
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function AirtelTigoLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/airtel-money.png"
      alt="AirtelTigo Money"
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
