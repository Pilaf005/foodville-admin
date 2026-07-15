/**
 * Cached Mongoose connection for Next.js.
 *
 * DNS note: this machine's system DNS resolver refuses c-ares queries
 * (`querySrv ECONNREFUSED`), which breaks MongoDB Atlas `mongodb+srv` SRV
 * resolution. Node's `dns.setServers` doesn't reliably take effect inside
 * Next's Turbopack worker, so we resolve the SRV/TXT records ourselves using
 * an explicit public resolver and connect with a STANDARD `mongodb://` URI
 * (real shard hostnames, resolved by the working getaddrinfo path, TLS intact).
 * The resolved URI is cached so this happens once per process.
 *
 * The connection object/promise is cached on `globalThis` so exactly one pool
 * is shared across hot-reloads and requests.
 */
import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "@/server/config/env";
import { AppError } from "@/server/utils/apiError";

const GLOBAL_KEY = "__foodville_mongoose__";

let cached = globalThis[GLOBAL_KEY];
if (!cached) {
  cached = globalThis[GLOBAL_KEY] = { conn: null, promise: null, uri: null };
}

function publicDnsServers() {
  const raw = process.env.DNS_SERVERS ?? "1.1.1.1,8.8.8.8";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Turn a `mongodb+srv://` URI into a standard `mongodb://` URI by resolving the
 * SRV (host list) and TXT (options) records via an explicit public resolver.
 * Returns non-SRV URIs unchanged.
 */
async function toStandardUri(srvUri) {
  if (!srvUri.startsWith("mongodb+srv")) return srvUri;

  const url = new URL(srvUri);
  const host = url.hostname;

  const resolver = new dns.promises.Resolver();
  const servers = publicDnsServers();
  if (servers.length) resolver.setServers(servers);

  const [srv, txt] = await Promise.all([
    resolver.resolveSrv(`_mongodb._tcp.${host}`),
    resolver.resolveTxt(host).catch(() => []),
  ]);

  if (!srv.length) throw new Error("SRV lookup returned no hosts");

  const hosts = srv.map((s) => `${s.name}:${s.port}`).join(",");
  const txtParams = txt.flat().join("&"); // e.g. authSource=admin&replicaSet=...
  const userInfo = url.username ? `${url.username}:${url.password}@` : "";
  const db = url.pathname && url.pathname !== "/" ? url.pathname : "";
  const orig = url.search ? url.search.slice(1) : "";
  const params = ["ssl=true", txtParams, orig].filter(Boolean).join("&");
  return `mongodb://${userInfo}${hosts}${db}?${params}`;
}

async function resolveConnectionUri() {
  if (cached.uri) return cached.uri;
  try {
    cached.uri = await toStandardUri(env.mongoUri);
  } catch (err) {
    throw new AppError(
      "Could not resolve the MongoDB Atlas address (DNS SRV lookup failed).",
      503,
      "DB_DNS_FAILED",
      { cause: err?.message }
    );
  }
  return cached.uri;
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!env.mongoUri) {
    throw new AppError(
      "Database is not configured. Add MONGODB_URI to .env.local (MongoDB Atlas connection string).",
      503,
      "DB_NOT_CONFIGURED"
    );
  }

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = (async () => {
      const uri = await resolveConnectionUri();
      return mongoose.connect(uri, {
        dbName: env.mongoDb || undefined,
        tls: true,
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      });
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next request
    if (err instanceof AppError) throw err;
    throw new AppError(
      "Could not connect to the database. Check MONGODB_URI and Atlas network access.",
      503,
      "DB_CONNECTION_FAILED",
      { cause: err?.message }
    );
  }

  return cached.conn;
}

export default connectDB;
