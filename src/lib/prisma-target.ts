import { PrismaClient as TargetPrismaClient } from "@/generated/target-client";

const prismaTargetClientSingleton = () => {
  return new TargetPrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaTargetGlobal: undefined | ReturnType<typeof prismaTargetClientSingleton>;
}

export const prismaTarget = globalThis.prismaTargetGlobal ?? prismaTargetClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaTargetGlobal = prismaTarget;
}

export default prismaTarget;
