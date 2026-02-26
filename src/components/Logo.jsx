import logoImage from "../6214ff04ba3c68672b23d6cf.png";

export function Logo({ size = 80 }) {
  return (
    <img 
      src={logoImage} 
      alt="MTG Logo" 
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: 12,
      }}
    />
  );
}
