import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/* 
model Playlist {
    id         String   @id @default(cuid())
    name       String
    description String?
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    userId     String
    songs      Song[]
    protection String  // PUBLIC_UNLOCKED, PUBLIC_LOCKED, PRIVATE

    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt
}

model Song {
    id         String   @id @default(cuid())
    name       String
    artist     String
    album      String
    playlistId String?
    playlist   Playlist? @relation(fields: [playlistId], references: [id], onDelete: Cascade)

    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt
}
*/

const song = z.object({
    id: z.string(),
    name: z.string(),
    artist: z.string(),
    album: z.string().optional()
})

export const playlistRouter = createTRPCRouter({
    create: protectedProcedure
                .input(z.object({
                    name: z.string(),
                    description: z.string().optional(),
                    protection: z.enum(["PUBLIC_UNLOCKED", "PUBLIC_LOCKED", "PRIVATE"]).optional(),
                }))
                .mutation(async ({ ctx, input }) => {
                    const playlist = await ctx.prisma.playlist.create({
                        data: {
                            name: input.name,
                            description: input.description,
                            userId: ctx.session.user.id,
                            protection: input.protection ?? "PUBLIC_UNLOCKED",
                        },
                    })
                    return playlist
                }),
    readById: protectedProcedure
                .input(z.object({
                    id: z.string(),
                }))
                .query(async ({ ctx, input }) => {
                    const playlist = await ctx.prisma.playlist.findUnique({
                        where: {
                            id: input.id,
                        },
                    })
                    return playlist
                }),
    readByUserId: protectedProcedure
                .input(z.object({
                    userId: z.string(),
                }))
                .query(async ({ ctx, input }) => {
                    const playlists = await ctx.prisma.playlist.findMany({
                        where: {
                            userId: input.userId,
                        },
                    })
                    return playlists
                }),
    update: protectedProcedure
                .input(z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string().optional(),
                    protection: z.enum(["PUBLIC_UNLOCKED", "PUBLIC_LOCKED", "PRIVATE"]).optional(),
                }))
                .mutation(async ({ ctx, input }) => {
                    const playlist = await ctx.prisma.playlist.update({
                        where: {
                            id: input.id,
                            userId: ctx.session.user.id
                        },
                        data: {
                            name: input.name,
                            description: input.description,
                            protection: input.protection ?? "PUBLIC_UNLOCKED",
                        },
                    })
                    return playlist
                }),
    delete: protectedProcedure
                .input(z.object({
                    id: z.string(),
                }))
                .mutation(async ({ ctx, input }) => {
                    const playlist = await ctx.prisma.playlist.delete({
                        where: {
                            id: input.id,
                            userId: ctx.session.user.id
                        },
                    })
                    return playlist
                }),
    addSong: protectedProcedure
                .input(z.object({
                    playlistId: z.string(),
                    song: song,
                }))
                .mutation(async ({ ctx, input }) => {
                    const playlist = await ctx.prisma.playlist.findUnique({
                        where: {
                            id: input.playlistId,
                        },
                    }) 
                    if (!playlist) return new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" })
                    if (playlist.protection == "PUBLIC_UNLOCKED") {
                        const song = await ctx.prisma.song.create({
                            data: {
                                name: input.song.name,
                                artist: input.song.artist,
                                album: input.song.album,
                                playlistId: input.playlistId,
                            },
                        })
                        return song
                    }
                    if (playlist.protection == "PUBLIC_LOCKED") return new TRPCError({ code: "FORBIDDEN", message: "Playlist is locked" })
                }),
    removeSong: protectedProcedure
                .input(z.object({
                    playlistId: z.string(),
                    songId: z.string(),
                }))
                .mutation(async ({ ctx, input }) => {
                    const playlist = await ctx.prisma.playlist.findUnique({
                        where: {
                            id: input.playlistId,
                        },
                    }) 
                    if (!playlist) return new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" })
                    if (playlist.protection == "PUBLIC_UNLOCKED") {
                        const song = await ctx.prisma.song.delete({
                            where: {
                                id: input.songId,
                            },
                        })
                        return song
                    }
                    if (playlist.protection == "PUBLIC_LOCKED") return new TRPCError({ code: "FORBIDDEN", message: "Playlist is locked" })
                }),
})