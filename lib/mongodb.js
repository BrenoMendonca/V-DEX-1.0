import dns from "dns";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI não está definida em .env.local");
}

// O resolvedor de DNS do Node falha ao consultar o registro SRV do Atlas em
// algumas redes (comum no Windows, quando o DNS do sistema é um endereço
// IPv6 link-local) mesmo quando o SO resolve normalmente — forçar um DNS
// público evita o "querySrv ECONNREFUSED" nessas máquinas.
if (MONGODB_URI.startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((mongoose) => mongoose)
      .catch((error) => {
        // Sem isso, uma falha de conexão fica presa em cache pra sempre — toda
        // chamada seguinte reproduziria o mesmo erro antigo em vez de tentar de novo.
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
