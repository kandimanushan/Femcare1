"use client"

import { useState, useEffect } from "react"
import { Upload, FileText, BarChart2, MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnalysisCharts } from "@/components/charts/analysis-charts"
import AnalysisChatInterface from "@/components/analysis-chat-interface"
import { Language } from "@/lib/translations"

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const currentLanguage: Language = "english"

  useEffect(() => {
    // Set the active tab in localStorage only if it's not already set
    const currentTab = localStorage.getItem("activeTab")
    if (currentTab !== "analysis") {
      localStorage.setItem("activeTab", "analysis")
    }
  }, [])

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Clean up any ongoing operations when component unmounts
      if (isAnalyzing) {
        setIsAnalyzing(false)
      }
    }
  }, [isAnalyzing])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
    } else {
      setError("Please select a valid PDF file")
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to analyze document")
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze document")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Analysis</h1>
          <p className="text-muted-foreground">Upload and analyze medical documents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>Upload a PDF medical document for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : "Click to upload PDF"}
                  </span>
                </label>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Analyze Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>View insights and visualizations</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4">
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold mb-2">Summary</h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {analysis.summary}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold mb-2">Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keywords?.map((keyword: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold mb-2">Key Findings</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                        {analysis.findings?.map((finding: string, index: number) => (
                          <li key={index}>{finding}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                        {analysis.recommendations?.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    {analysis.concerns && analysis.concerns.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
                          Concerns
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                          {analysis.concerns.map((concern: string, index: number) => (
                            <li key={index}>{concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="charts">
                  <AnalysisCharts data={analysis.chartData} />
                </TabsContent>
                <TabsContent value="insights">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {analysis.findings?.map((finding: string, index: number) => (
                        <div key={index} className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Finding {index + 1}</p>
                          <p className="text-sm">{finding}</p>
                        </div>
                      ))}
                      {analysis.recommendations?.map((rec: string, index: number) => (
                        <div key={`rec-${index}`} className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Recommendation {index + 1}</p>
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                      {analysis.concerns?.map((concern: string, index: number) => (
                        <div key={`concern-${index}`} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-sm font-medium mb-1 text-red-600 dark:text-red-400">Concern {index + 1}</p>
                          <p className="text-sm">{concern}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center text-muted-foreground">
                Upload a document to see analysis results
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Section */}
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
          <CardDescription>Ask questions about the analyzed document</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalysisChatInterface currentLanguage={currentLanguage} />
        </CardContent>
      </Card>
    </div>
  )
} 