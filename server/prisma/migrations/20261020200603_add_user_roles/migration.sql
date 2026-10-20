-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'GUEST';
