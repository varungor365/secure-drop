import JSZip from "jszip";

/**
 * Extracts and recursively zips a dropped folder using the File System Access API.
 * @param item - A DataTransferItem from a drop event.
 * @returns A File object containing the zipped directory.
 */
export async function zipDroppedFolder(item: DataTransferItem): Promise<File | null> {
  const entry = item.webkitGetAsEntry();
  if (!entry || !entry.isDirectory) {
    return null;
  }

  const zip = new JSZip();

  // Recursively walk the directory tree and add files to the zip instance
  async function traverseEntry(currentEntry: FileSystemEntry, currentPath: string) {
    if (currentEntry.isFile) {
      const fileEntry = currentEntry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      // Add the file to the zip at its relative path
      zip.file(`${currentPath}${file.name}`, file);
    } else if (currentEntry.isDirectory) {
      const dirEntry = currentEntry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });

      for (const child of entries) {
        await traverseEntry(child, `${currentPath}${dirEntry.name}/`);
      }
    }
  }

  await traverseEntry(entry, "");
  
  // Generate the zip blob
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" }); // STORE is fastest since we AES encrypt later anyway

  // Create a File from the Blob
  const folderName = entry.name || "folder";
  return new File([zipBlob], `${folderName}.zip`, {
    type: "application/zip",
    lastModified: Date.now(),
  });
}

/**
 * Bundles multiple File objects into a single zip archive.
 * @param files - Array of File objects to zip.
 * @returns A File object containing the zipped files.
 */
export async function zipMultipleFiles(files: File[]): Promise<File | null> {
  if (!files || files.length === 0) return null;

  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file);
  }

  // Generate the zip blob
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });

  // Create a File from the Blob
  return new File([zipBlob], `Archive_${files.length}_Files.zip`, {
    type: "application/zip",
    lastModified: Date.now(),
  });
}
