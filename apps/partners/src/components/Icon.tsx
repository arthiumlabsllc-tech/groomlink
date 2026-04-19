interface IconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}

export default function Icon({ name, className = '', size = 24, filled = false }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
    >
      {name}
    </span>
  );
}
