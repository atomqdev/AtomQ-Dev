import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import archiver from "archiver"
import { createWriteStream, unlink } from "fs"
import { promises as fs } from "fs"
import { join } from "path"
import { tmpdir } from "os"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Require authentication to download source
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      )
    }

    // Create a temporary file for the zip
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const zipFileName = `atom-q-source-${timestamp}.zip`
    const zipPath = join(tmpdir(), zipFileName)

    // Create output stream
    const output = createWriteStream(zipPath)
    const archive = archiver("zip", {
      zlib: { level: 9 } // Maximum compression
    })

    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err)
      throw err
    })

    // Pipe archive to output
    archive.pipe(output)

    // Get the project root directory
    const projectRoot = process.cwd()

    // Function to recursively add files to archive
    async function addDirectoryToArchive(dirPath: string, relativePath: string) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)
        const entryRelativePath = join(relativePath, entry.name)

        // Skip certain directories and files
        if (
          entry.name === "node_modules" ||
          entry.name === ".next" ||
          entry.name === ".git" ||
          entry.name === "upload" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".env.local" ||
          entry.name.startsWith(".env.") ||
          entry.name.endsWith(".log") ||
          entry.name.endsWith(".lock") ||
          entry.name === "bun.lockb"
        ) {
          continue
        }

        if (entry.isDirectory()) {
          // Recursively add subdirectory
          await addDirectoryToArchive(fullPath, entryRelativePath)
        } else {
          // Add file to archive
          archive.file(fullPath, { name: entryRelativePath })
        }
      }
    }

    // Add all project files to archive
    await addDirectoryToArchive(projectRoot, "")

    // Finalize the archive
    await new Promise<void>((resolve, reject) => {
      archive.on("end", resolve)
      archive.on("error", reject)
      archive.finalize()
    })

    // Wait for the output stream to finish
    await new Promise<void>((resolve, reject) => {
      output.on("close", resolve)
      output.on("error", reject)
    })

    // Read the zip file
    const zipBuffer = await fs.readFile(zipPath)

    // Clean up the temp file
    unlink(zipPath, () => {})

    // Send the zip file as response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="atom-q-source-${timestamp}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error creating source code zip:", error)
    return NextResponse.json(
      { error: "Failed to create source code download" },
      { status: 500 }
    )
  }
}
