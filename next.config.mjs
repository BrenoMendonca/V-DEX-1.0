/** @type {import('next').NextConfig} */
const nextConfig = {
  // Opcional — só necessário pra testar em outro aparelho na mesma rede local durante o
  // desenvolvimento (ex: celular acessando o IP do computador). Defina no seu .env.local.
  ...(process.env.ALLOWED_DEV_ORIGIN ? { allowedDevOrigins: [process.env.ALLOWED_DEV_ORIGIN] } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/**",
      },
      {
        protocol: "https",
        hostname: "play.pokemonshowdown.com",
        pathname: "/sprites/**",
      },
    ],
  },
};

export default nextConfig;
