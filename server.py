from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict
import httpx
import json
from datetime import datetime
from starlette.responses import StreamingResponse
import markdown
from markdown.extensions import fenced_code, tables, nl2br
import pdfplumber
import io
import os

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama API configuration
OLLAMA_API_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2"

# Enhanced system prompt with markdown formatting
DEFAULT_SYSTEM_PROMPT = """You are Femcarebot, a helpful healthcare assistant with expertise in medical information and wellness.

**Guidelines:**
- Provide general health information and guidance in a clear, structured format
- Use markdown formatting to organize information:
  - Use headers (##) for main topics
  - Use bullet points for lists
  - Use **bold** for important points
  - Use `code blocks` for specific measurements or values
  - Use tables when comparing information
- Do not provide specific medical diagnoses or treatment plans
- Always recommend consulting with a healthcare professional for specific medical concerns
- Be empathetic and supportive
- Provide evidence-based information when possible
- Clearly state when you don't know something
- Focus on general wellness advice and educational information
- Maintain user privacy and confidentiality

**Response Format:**
- Start with a clear, concise answer
- Use markdown formatting for better readability
- Include relevant examples or analogies when helpful
- End with a summary of key points"""

# Chat with Ollama LLM
async def stream_ollama_response(messages, system_prompt=None, temperature=0.7, max_tokens=2000):
    # Prepare the request payload with enhanced parameters
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "seed": 42,
            "num_ctx": 4096,
            "num_thread": 4
        }
    }
    
    if system_prompt:
        payload["system"] = system_prompt
    else:
        payload["system"] = DEFAULT_SYSTEM_PROMPT
    
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", f"{OLLAMA_API_URL}/api/chat", json=payload, timeout=60.0) as response:
            if response.status_code != 200:
                error_detail = await response.aread()
                raise HTTPException(status_code=response.status_code, detail=f"Ollama API error: {error_detail}")
            
            async for chunk in response.aiter_bytes():
                if chunk:
                    try:
                        data = json.loads(chunk)
                        if "message" in data and "content" in data["message"]:
                            # Convert markdown to HTML
                            content = data["message"]["content"]
                            html_content = markdown.markdown(
                                content,
                                extensions=['fenced_code', 'tables', 'nl2br', 'markdown.extensions.extra']
                            )
                            yield f"data: {json.dumps({'text': content, 'html': html_content})}\n\n"
                    except json.JSONDecodeError:
                        continue
            
            yield f"data: [DONE]\n\n"

@app.post("/api/chat")
async def chat_with_llm(request: Dict):
    messages = request.get("messages", [])
    system_prompt = request.get("systemPrompt") or DEFAULT_SYSTEM_PROMPT
    
    return StreamingResponse(
        stream_ollama_response(
            messages, 
            system_prompt=system_prompt,
            temperature=request.get("temperature", 0.7),
            max_tokens=request.get("max_tokens", 2000)
        ),
        media_type="text/event-stream"
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/ollama-status")
async def check_ollama_status():
    """Check if Ollama service is available and running."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_API_URL}/api/version", timeout=3.0)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "online",
                    "message": "Ollama service is running",
                    "version": data.get("version", "unknown")
                }
            else:
                return {
                    "status": "error",
                    "message": f"Ollama service returned status code {response.status_code}"
                }
    except httpx.RequestError as e:
        return {
            "status": "error",
            "message": f"Failed to connect to Ollama service: {str(e)}"
        }

@app.post("/api/analyze")
async def analyze_document(file: UploadFile = File(...)):
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Save the file temporarily
        with open("temp.pdf", "wb") as f:
            f.write(contents)
        
        # Extract text from PDF
        text = ""
        with pdfplumber.open("temp.pdf") as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        
        # Clean up temporary file
        os.remove("temp.pdf")
        
        # Generate analysis using Ollama
        prompt = f"""Analyze the following medical document and provide:
1. A concise summary of the key points
2. Important keywords and medical terms
3. Key findings and recommendations
4. Any potential concerns or follow-up actions

Document text:
{text}

Please format your response as JSON with the following structure:
{{
    "summary": "A concise summary of the document",
    "keywords": ["list", "of", "important", "keywords"],
    "findings": ["list", "of", "key", "findings"],
    "recommendations": ["list", "of", "recommendations"],
    "concerns": ["list", "of", "concerns", "if", "any"]
}}"""

        # Prepare the request payload
        payload = {
            "model": OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 2000,
                "top_k": 40,
                "top_p": 0.9,
                "repeat_penalty": 1.1,
                "seed": 42,
                "num_ctx": 4096,
                "num_thread": 4
            }
        }
        
        # Get analysis from Ollama
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{OLLAMA_API_URL}/api/chat", json=payload, timeout=60.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to get analysis from Ollama")
            
            data = response.json()
            analysis_text = data.get("message", {}).get("content", "")
        
        # Parse the analysis text as JSON
        try:
            analysis = json.loads(analysis_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, create a structured response from the text
            analysis = {
                "summary": analysis_text[:500] + "...",  # First 500 chars as summary
                "keywords": ["Error parsing analysis"],
                "findings": ["Error parsing analysis"],
                "recommendations": ["Error parsing analysis"],
                "concerns": ["Error parsing analysis"]
            }
        
        return analysis
        
    except Exception as e:
        print(f"Error analyzing document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_summary(text: str) -> str:
    # Simple summary generation - in a real implementation, you'd use more sophisticated NLP
    sentences = text.split('.')
    if len(sentences) > 3:
        return '. '.join(sentences[:3]) + '.'
    return text

def generate_insights(text: str) -> List[str]:
    insights = []
    medications = extract_medications(text)
    diagnoses = extract_diagnoses(text)
    dates = extract_dates(text)

    if medications:
        insights.append(f"Found {len(medications)} medications: {', '.join(medications)}")
    if diagnoses:
        insights.append(f"Found {len(diagnoses)} diagnoses: {', '.join(diagnoses)}")
    if dates:
        insights.append(f"Found {len(dates)} important dates: {', '.join(dates)}")

    return insights

def extract_medications(text: str) -> List[str]:
    # Simple medication extraction - in a real implementation, you'd use a medical terminology database
    medications = []
    common_medications = ["aspirin", "ibuprofen", "paracetamol", "antibiotics", "insulin"]
    words = text.lower().split()
    
    for i, word in enumerate(words):
        if word in common_medications:
            # Try to get the full medication name
            if i > 0 and words[i-1] not in ["the", "a", "an", "and", "or"]:
                medications.append(f"{words[i-1]} {word}")
            else:
                medications.append(word)
    
    return list(set(medications))

def extract_diagnoses(text: str) -> List[str]:
    # Simple diagnosis extraction - in a real implementation, you'd use a medical terminology database
    diagnoses = []
    common_diagnoses = ["diabetes", "hypertension", "asthma", "arthritis", "cancer"]
    words = text.lower().split()
    
    for i, word in enumerate(words):
        if word in common_diagnoses:
            # Try to get the full diagnosis
            if i > 0 and words[i-1] not in ["the", "a", "an", "and", "or"]:
                diagnoses.append(f"{words[i-1]} {word}")
            else:
                diagnoses.append(word)
    
    return list(set(diagnoses))

def extract_dates(text: str) -> List[str]:
    # Simple date extraction
    import re
    date_pattern = r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}'
    return list(set(re.findall(date_pattern, text)))

def generate_chart_data(text: str) -> Dict:
    medications = extract_medications(text)
    diagnoses = extract_diagnoses(text)
    dates = extract_dates(text)

    return {
        "medications": {
            "labels": medications,
            "data": [100] * len(medications)  # Placeholder data
        },
        "diagnoses": {
            "labels": diagnoses,
            "data": [100] * len(diagnoses)  # Placeholder data
        },
        "timeline": {
            "labels": dates,
            "data": [100] * len(dates)  # Placeholder data
        }
    }

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

