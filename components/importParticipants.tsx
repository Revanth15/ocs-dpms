"use client"

import { useState } from "react"
import Papa from "papaparse"
import { useRouter } from "next/navigation"
import { FileUp, Upload, X } from "lucide-react"
import { bulkCreateParticipants } from "@/lib/firebase-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type CSVParticipant = {
  name: string
  formation: string
  contingent: string
}

export function UploadParticipantsForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<CSVParticipant[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const fileType = selectedFile.name.split(".").pop()?.toLowerCase()
    if (fileType !== "csv") {
      setError("Please upload a CSV file")
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setParsing(true)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as Array<Record<string, string>>
          const participants: CSVParticipant[] = data
            .filter((row) => row.Name && row.Formation && row.Contingent)
            .map((row) => ({
              name: row.Name.trim(),
              formation: row.Formation.trim(),
              contingent: row.Contingent.trim(),
            }))

          if (participants.length === 0) {
            throw new Error("No valid participants found in the CSV file.")
          }

          setPreviewData(participants)
        } catch (err) {
          console.error("Parsing error:", err)
          setError("Failed to parse CSV. Make sure it has Name, Formation, and Contingent columns.")
          setFile(null)
        } finally {
          setParsing(false)
        }
      },
      error: (err) => {
        setError("Failed to parse file: " + err.message)
        setParsing(false)
        setFile(null)
      },
    })
  }

  const handleUpload = async () => {
    if (!previewData) return

    const isValid = previewData.every((p) => p.name && p.formation && p.contingent)
    if (!isValid) {
      setError("All participants must have a name, formation, and contingent assigned")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const participantsToUpload = previewData.map((p) => ({
        name: p.name,
        formation: p.formation,
        contingent: p.contingent,
        totalPeriodsAbsent: 0,
      }))
      await bulkCreateParticipants(participantsToUpload)

      alert("Participants uploaded successfully!")
      setFile(null)
      setPreviewData(null)
      router.push("/participants")
    } catch (err) {
      console.error(err)
      setError("Error uploading participants. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setPreviewData(null)
    setError(null)
  }

  const handleFormationChange = (index: number, value: string) => {
    if (!previewData) return
    const newData = [...previewData]
    newData[index].formation = value
    setPreviewData(newData)
  }

  const handleContingentChange = (index: number, value: string) => {
    if (!previewData) return
    const newData = [...previewData]
    newData[index].contingent = value
    setPreviewData(newData)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Participants</CardTitle>
        <CardDescription>
          Upload a CSV file with participant names. Then assign each participant to a formation and contingent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!previewData ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
            <FileUp className="h-8 w-8 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <h3 className="font-semibold">Upload your file</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to upload a CSV file with columns: Name, Formation, Contingent.
              </p>
            </div>
            <div className="mt-4">
              <Label htmlFor="file-upload" className="sr-only">Choose a file</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={parsing}
              />
            </div>
            {parsing && <div className="mt-4">Parsing file...</div>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                <span className="font-medium">{file?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Formation</TableHead>
                    <TableHead>Contingent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Input value={p.formation} onChange={(e) => handleFormationChange(i, e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input value={p.contingent} onChange={(e) => handleContingentChange(i, e.target.value)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={resetForm} disabled={!file || uploading}>
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={!previewData || uploading}>
          {uploading ? "Uploading..." : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Participants
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
