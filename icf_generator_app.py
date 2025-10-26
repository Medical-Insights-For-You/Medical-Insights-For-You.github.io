import streamlit as st
import time
import textstat
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import io
import json
import pandas as pd
import requests
from typing import Dict, List, Optional
import PyPDF2
import anthropic
import os

# --- Page Configuration ---
st.set_page_config(
    page_title="ICF-GPT",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Session State Initialization ---
if "templates" not in st.session_state:
    st.session_state.templates = {}
if "generated_content" not in st.session_state:
    st.session_state.generated_content = None 
if "template_bytes_for_download" not in st.session_state:
    st.session_state.template_bytes_for_download = None 
if "file_name_info" not in st.session_state:
    st.session_state.file_name_info = None 
if "final_docx_bytes" not in st.session_state:
    st.session_state.final_docx_bytes = None
if "final_file_name" not in st.session_state:
    st.session_state.final_file_name = None

# --- Sidebar: Template Library Manager ---
with st.sidebar:
    st.header("Template Library")
    
    with st.form("new_template_form", clear_on_submit=True):
        st.subheader("Add a New Template")
        new_template_name = st.text_input("Template Name (e.g., 'UCSF IRB')")
        
        new_template_file = st.file_uploader(
            "1. Upload .docx Template (Structure)", 
            type="docx",
            help="The .docx file with the section headings."
        )
        new_language_file = st.file_uploader(
            "2. Upload Approved Language Doc (Optional)",
            type=["pdf", "docx", "txt", "md"],
            help="Optional: The doc with IRB-approved 'boilerplate' text."
        )
        
        submitted = st.form_submit_button("Save Template")
        
        if submitted:
            if new_template_name and new_template_file:
                if new_template_name in st.session_state.templates:
                    st.warning(f"Template '{new_template_name}' already exists. Overwriting.")
                
                template_bytes = new_template_file.getvalue()
                template_data = {
                    "template_filename": new_template_file.name,
                    "template_bytes": template_bytes
                }
                
                if new_language_file:
                    language_bytes = new_language_file.getvalue()
                    template_data["language_filename"] = new_language_file.name
                    template_data["language_bytes"] = language_bytes
                
                st.session_state.templates[new_template_name] = template_data
                st.success(f"Saved template: '{new_template_name}'")
            else:
                st.error("Please provide at least a Template Name and a .docx Template file.")
    
    if st.session_state.templates:
        st.divider()
        st.subheader("Saved Templates")
        for t_name, data in st.session_state.templates.items():
            caption = f"📄 {t_name} (Structure)"
            if data.get("language_filename"):
                caption += " + 🗣️ (Language)"
            st.caption(caption)


# --- REAL API FUNCTIONS ---

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using PyPDF2"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        st.error(f"Error extracting PDF text: {e}")
        return ""

def extract_text_from_docx(docx_bytes: bytes) -> str:
    """Extract text from DOCX"""
    try:
        doc = Document(io.BytesIO(docx_bytes))
        text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return text
    except Exception as e:
        st.error(f"Error extracting DOCX text: {e}")
        return ""

def call_claude_api(prompt: str, system_prompt: str = "", max_tokens: int = 4096) -> str:
    """Synchronous call to Claude API for text generation (used for structured parsing only)"""
    claude_api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not claude_api_key:
        return "" 
    
    try:
        client = anthropic.Anthropic(api_key=claude_api_key)
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system_prompt if system_prompt else anthropic.NOT_GIVEN,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return message.content[0].text
    except Exception as e:
        st.error(f"Claude API Error: {e}")
        return ""

def parse_protocol_with_claude(protocol_text: str, file_type: str) -> Optional[Dict]:
    """Use Claude to extract structured data from protocol"""
    
    system_prompt = """You are a clinical research expert. Extract key information from research protocols and return it as JSON.
    
    Extract these fields:
    - title: Study title
    - purpose: Primary objective
    - procedures: List of study procedures
    - risks: List of risks (each with 'name' and 'details')
    - benefits: Potential benefits
    - alternatives: Alternative treatments
    - compensation: Payment details
    - confidentiality: Privacy/confidentiality information
    
    Return ONLY valid JSON, no additional text."""
    
    prompt = f"""Analyze this clinical research protocol and extract the required information:

{protocol_text[:15000]}  

Return the information as a JSON object with the structure specified in the system prompt."""
    
    try:
        response = call_claude_api(prompt, system_prompt, max_tokens=4096)
        
        if not response:
            return None
        
        # Try to parse JSON from response
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            json_str = response.split("```")[1].split("```")[0].strip()
        else:
            json_str = response.strip()
        
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        st.error(f"Error parsing Claude response as JSON: {e}")
        st.text("Response received:")
        st.text(response[:500])
        return None
    except Exception as e:
        st.error(f"Error processing protocol: {e}")
        return None

def parse_approved_language_with_claude(language_text: str, filename: str) -> Dict:
    """Use Claude to extract approved language snippets"""
    
    system_prompt = """You are extracting IRB-approved language templates. Return as JSON with these keys:
    - risks_intro: Introduction to risks section
    - confidentiality: HIPAA/privacy language
    - payment: Compensation language
    - voluntary: Voluntary participation language
    
    Return ONLY valid JSON."""
    
    prompt = f"""Extract IRB-approved language templates from this document:

{language_text[:10000]}

Return as JSON with the keys specified."""
    
    try:
        response = call_claude_api(prompt, system_prompt, max_tokens=2048)
        
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            json_str = response.split("```")[1].split("```")[0].strip()
        else:
            json_str = response.strip()
        
        return json.loads(json_str)
    except Exception as e:
        st.warning(f"Could not parse approved language: {e}")
        return {}


# --- CRITICAL FIX: STREAMING FUNCTION ---

def generate_icf_content_with_claude_streaming(
    protocol_data: Dict, 
    approved_language: Dict, 
    template_headings: List[str]
) -> Dict[str, str]:
    """
    Uses Claude API streaming to generate ICF content for each section, updating the UI live.
    This replaces the original blocking function.
    """
    
    system_prompt = """You are a clinical research professional creating an Informed Consent Form (ICF). 
    Generate formal, compliant ICF text at a collegiate reading level. Use approved language when provided.
    Be thorough, accurate, and maintain appropriate medical/legal terminology.
    Return ONLY the generated text for each section, no additional formatting, headers, or comments."""
    
    generated_content = {}
    claude_api_key = os.environ.get("ANTHROPIC_API_KEY")

    if not claude_api_key:
        st.error("Cannot generate content: Anthropic API key is missing.")
        return {}

    client = anthropic.Anthropic(api_key=claude_api_key)
    
    # Use a container to hold the live-updated text areas, ensuring they don't jump around.
    streaming_container = st.container()

    for heading in template_headings:
        # Create the detailed prompt for the current section
        prompt = f"""Generate content for this ICF section: "{heading}"

Protocol Information:
{json.dumps(protocol_data, indent=2)}

Approved Language Templates:
{json.dumps(approved_language, indent=2)}

Generate formal, compliant text for the "{heading}" section. Use approved language where applicable.
If this section relates to risks, use the risks_intro template as a starting point.
If this section relates to confidentiality, use the confidentiality template.

Return ONLY the paragraph text for this section, no headers or additional formatting."""
        
        try:
            # 1. Add a subheader for the section and a live placeholder
            streaming_container.subheader(f"✍️ Drafting: {heading}")
            placeholder = streaming_container.empty()
            full_content = ""
            
            # 2. Use the STREAMING API call
            with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=1500, # A high enough limit for a single section
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            ) as stream:
                for chunk in stream:
                    # 3. Append and update the Streamlit placeholder with each text chunk
                    if chunk.type == "content_block_delta" and chunk.delta.text is not None:
                        full_content += chunk.delta.text
                        # Display content with a pulsing cursor to show activity
                        placeholder.markdown(full_content + "▌") 
            
            # 4. Final update without the cursor and store the full content
            placeholder.markdown(full_content) 
            generated_content[heading] = full_content
            
        except Exception as e:
            st.warning(f"Error generating content for {heading}. Please check API key/limits. Error: {e}")
            generated_content[heading] = f"[Content for {heading} requires manual entry due to error]"
    
    return generated_content
    
# NOTE: The old 'generate_icf_content_with_claude' is now replaced by the function above.

def analyze_icf_with_claude(
    protocol_data: Dict,
    approved_language: Dict,
    icf_text: str
) -> Dict:
    """Use Claude to analyze ICF for gaps and issues"""
    
    system_prompt = """You are a clinical research compliance expert reviewing Informed Consent Forms.
    
    Analyze the ICF for:
    1. Readability (estimate grade level)
    2. Gaps compared to protocol
    3. Missing approved language
    4. Suggestions for improvement
    
    Return as JSON with keys: overall_score, gaps (list of strings), suggestions (list of objects with 'section', 'issue', 'suggestion')"""
    
    prompt = f"""Analyze this ICF for compliance and completeness:

PROTOCOL DATA:
{json.dumps(protocol_data, indent=2)}

APPROVED LANGUAGE REQUIREMENTS:
{json.dumps(approved_language, indent=2)}

ICF TEXT:
{icf_text[:20000]}

Identify:
1. Estimated reading grade level (overall_score)
2. Missing protocol information (gaps list)
3. Missing required language (gaps list)
4. Specific improvement suggestions

Return as JSON."""
    
    try:
        response = call_claude_api(prompt, system_prompt, max_tokens=3000)
        
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            json_str = response.split("```")[1].split("```")[0].strip()
        else:
            json_str = response.strip()
        
        analysis = json.loads(json_str)
        
        # Calculate readability scores for sections
        sections = parse_docx_sections_from_text(icf_text)
        readability_report = []
        for section, text in sections.items():
            if len(text) > 50:
                score = textstat.flesch_kincaid_grade(text)
                readability_report.append({"section": section, "score": score})
        
        analysis["readability_report"] = readability_report
        return analysis
        
    except Exception as e:
        st.error(f"Error analyzing ICF: {e}")
        return {"overall_score": 0, "gaps": [], "suggestions": [], "readability_report": []}

def summarize_icf_with_claude(sections: Dict[str, str], target_level: str) -> Dict[str, str]:
    """Use Claude to create patient-friendly summaries"""
    
    grade_level_guidance = {
        "6th Grade": "Use very simple language. Short sentences. Common everyday words. Explain medical terms in plain English.",
        "8th Grade": "Use clear, straightforward language. Moderate sentence length. Define technical terms when used."
    }
    
    system_prompt = f"""You are creating patient-friendly summaries of medical research consent forms.
    
    Target reading level: {target_level}
    Guidance: {grade_level_guidance[target_level]}
    
    Make the content accessible and easy to understand while maintaining accuracy."""
    
    summaries = {}
    
    for heading, text in sections.items():
        if len(text.strip()) < 20:
            summaries[heading] = text
            continue
            
        prompt = f"""Summarize this ICF section for a patient at a {target_level} reading level:

Section: {heading}

Original text:
{text[:2000]}

Create a clear, simple summary that a {target_level} student could understand."""
        
        try:
            summary = call_claude_api(prompt, system_prompt, max_tokens=800)
            summaries[heading] = summary if summary else text
        except Exception as e:
            st.warning(f"Error summarizing {heading}: {e}")
            summaries[heading] = text
    
    return summaries

def parse_docx_sections_from_text(text: str) -> Dict[str, str]:
    """Simple section parser for text"""
    sections = {}
    lines = text.split('\n')
    current_heading = "Introduction"
    current_text = []
    
    for line in lines:
        if line.strip() and (line.isupper() or line.endswith(':')):
            if current_text:
                sections[current_heading] = '\n'.join(current_text)
            current_heading = line.strip()
            current_text = []
        elif line.strip():
            current_text.append(line.strip())
    
    if current_text:
        sections[current_heading] = '\n'.join(current_text)
    
    return sections if sections else {"Full Document": text}

# --- HELPER FUNCTIONS FROM ORIGINAL (Updated to use real APIs) ---

def parse_template_headings(docx_bytes):
    try:
        doc = Document(io.BytesIO(docx_bytes))
        headings = []
        for p in doc.paragraphs:
            if p.style and p.style.name.startswith(('Heading 1', 'Heading 2', 'Heading 3')):
                if p.text.strip():
                    headings.append(p.text.strip())
        if not headings:
            for p in doc.paragraphs:
                if p.text.strip() and any(r.bold for r in p.runs):
                    headings.append(p.text.strip())
        if not headings:
            return ["Introduction", "Purpose", "Procedures", "Risks", "Benefits", "Alternatives", "Compensation", "Confidentiality"], doc
        return list(dict.fromkeys(headings)), doc
    except Exception as e:
        st.error(f"Error parsing DOCX file: {e}")
        return None, None

def populate_docx_template(template_doc_bytes, generated_content):
    """Populate DOCX template with generated content"""
    try:
        doc = Document(io.BytesIO(template_doc_bytes))
        paras = doc.paragraphs
        target_headings = set(generated_content.keys())
        
        all_heading_texts = set()
        for p in paras:
            p_text = p.text.strip()
            if not p_text:
                continue
            style_name = p.style.name if p.style else 'Normal'
            is_heading_style = style_name.startswith(('Heading 1', 'Heading 2', 'Heading 3'))
            is_bold = any(r.bold for r in p.runs)
            if is_heading_style or (is_bold and not style_name.startswith('Heading')):
                all_heading_texts.add(p_text)

        i = 0
        while i < len(paras):
            p = paras[i]
            p_text = p.text.strip()

            if p_text in target_headings:
                current_heading = p_text
                j = i + 1
                while j < len(paras):
                    next_p_text = paras[j].text.strip()
                    if next_p_text in all_heading_texts:
                        break
                    j += 1
                
                for k in range(j - 1, i, -1):
                    p_to_delete = paras[k]
                    p_to_delete._element.getparent().remove(p_to_delete._element)
                
                text_to_add = generated_content[current_heading]
                new_p = doc.add_paragraph(text_to_add, style='Normal')
                new_p.paragraph_format.space_before = Pt(6)
                new_p.paragraph_format.space_after = Pt(12)
                
                p_to_move = new_p._p
                p_after = p._p
                p_after.addnext(p_to_move)
                i = j
            else:
                i += 1
        
        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        return file_stream.getvalue()
    except Exception as e:
        st.error(f"Error populating DOCX template: {e}")
        return None

def parse_docx_sections(docx_bytes):
    try:
        doc = Document(io.BytesIO(docx_bytes))
        sections = {}
        current_heading = "Introduction"
        current_text = []
        for p in doc.paragraphs:
            style_name = p.style.name if p.style else 'Normal'
            is_heading = style_name.startswith(('Heading 1', 'Heading 2', 'Heading 3'))
            is_bold = any(r.bold for r in p.runs)
            
            if p.text.strip() and (is_heading or (is_bold and not style_name.startswith('Heading'))):
                if current_text:
                    sections[current_heading] = "\n".join(current_text)
                current_heading = p.text.strip()
                current_text = []
            elif p.text.strip():
                current_text.append(p.text.strip())
        
        if current_text:
            sections[current_heading] = "\n".join(current_text)
            
        if not sections:
            return {"error": "Could not read any text sections from the uploaded DOCX."}
        return sections
    except Exception as e:
        return {"error": f"Error parsing ICF DOCX: {e}"}


# --- Main Application UI ---
st.title("🩺 ICF-GPT: AI-Powered Informed Consent Generator")
st.markdown("Generate compliant ICFs from protocols using **Claude 4 Sonnet API** for real-time analysis.")

# Check API configuration and warn user if key is missing
if not os.environ.get("ANTHROPIC_API_KEY"):
    st.error("⚠️ **Anthropic API Key Not Found.** Please set the `ANTHROPIC_API_KEY` environment variable in your deployment environment (e.g., your local `.env` file, Streamlit Secrets, or your cloud provider settings) to enable AI functionality.")

tab_generate, tab_review, tab_summarize = st.tabs([
    "**1. Generate New ICF**", 
    "**2. Review & Analyze ICF**", 
    "**3. Patient Summarizer**"
])

# --- TAB 1: GENERATION MODE ---
with tab_generate:
    st.header("1. Generate AI Draft (Using Claude API)")
    
    with st.form("generation_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Inputs")
            protocol_file = st.file_uploader(
                "1. Upload the Protocol (PDF, DOCX, JSON, XML)", 
                type=["pdf", "docx", "json", "xml"], 
                help="The source protocol document."
            )
        
        with col2:
            st.subheader("Template")
            template_options = list(st.session_state.templates.keys())
            selected_template_name = None
            
            if not template_options:
                st.warning("No saved templates. Please add one in the sidebar to begin.")
            else:
                selected_template_name = st.selectbox(
                    "2. Select an IRB Template",
                    options=template_options,
                    help="Select a saved template from your library."
                )
        
        submitted = st.form_submit_button("✨ Generate AI Draft", type="primary", use_container_width=True)

    if submitted:
        st.session_state.final_docx_bytes = None
        st.session_state.final_file_name = None
        
        template_info = None
        if selected_template_name:
            template_info = st.session_state.templates[selected_template_name]
        
        if protocol_file is not None and template_info is not None:
            if not os.environ.get("ANTHROPIC_API_KEY"):
                st.error("Please set the `ANTHROPIC_API_KEY` environment variable to use the AI functionality.")
            else:
                with st.spinner("🤖 Claude is analyzing your protocol..."):
                    # Extract text from protocol
                    protocol_bytes = protocol_file.getvalue()
                    file_ext = protocol_file.name.split('.')[-1].lower()
                    
                    if file_ext == "pdf":
                        protocol_text = extract_text_from_pdf(protocol_bytes)
                    elif file_ext == "docx":
                        protocol_text = extract_text_from_docx(protocol_bytes)
                    elif file_ext in ["json", "xml"]:
                        protocol_text = protocol_bytes.decode('utf-8')
                    else:
                        st.error(f"Unsupported file type: {file_ext}")
                        protocol_text = None
                    
                    if protocol_text:
                        # Parse protocol with Claude
                        protocol_data = parse_protocol_with_claude(protocol_text, file_ext)
                        
                        if protocol_data:
                            # Get template headings
                            template_bytes = template_info["template_bytes"]
                            template_headings, _ = parse_template_headings(template_bytes)
                            
                            # Parse approved language if exists
                            approved_language_data = {}
                            if "language_bytes" in template_info:
                                lang_bytes = template_info["language_bytes"]
                                lang_ext = template_info["language_filename"].split('.')[-1].lower()
                                
                                if lang_ext == "pdf":
                                    lang_text = extract_text_from_pdf(lang_bytes)
                                elif lang_ext == "docx":
                                    lang_text = extract_text_from_docx(lang_bytes)
                                else:
                                    lang_text = lang_bytes.decode('utf-8')
                                
                                approved_language_data = parse_approved_language_with_claude(
                                    lang_text, template_info["language_filename"]
                                )
                            
                            # Generate content with Claude - **UPDATED TO USE STREAMING**
                            st.info("✍️ Drafting in progress. Content will appear below section-by-section...")
                            
                            generated_content = generate_icf_content_with_claude_streaming(
                                protocol_data, 
                                approved_language_data, 
                                template_headings
                            )
                                
                            st.session_state.generated_content = generated_content
                            st.session_state.template_bytes_for_download = template_bytes
                            st.session_state.file_name_info = f"Generated_ICF_{selected_template_name.replace(' ', '_')}.docx"
                            st.success("✅ AI Draft Complete! Review and finalize below.")
        else:
            st.error("🚫 Please upload a Protocol and select a Template.")

    # Editor UI
    if st.session_state.generated_content:
        st.divider()
        st.header("2. Finalize and Download")
        st.info("Review and edit the AI-generated content before downloading.")
        
        # NOTE: The content below here is the **generated** content displayed after the streaming is complete.
        with st.form("editor_form"):
            final_content_map = {}
            for heading, text in st.session_state.generated_content.items():
                st.subheader(heading)
                edited_text = st.text_area(
                    f"Edit {heading}", 
                    value=text, 
                    height=200, 
                    key=f"edit_{heading}",
                    label_visibility="collapsed"
                )
                final_content_map[heading] = edited_text

            download_submitted = st.form_submit_button("✨ Finalize Document", type="primary", use_container_width=True)

            if download_submitted:
                with st.spinner("Creating final DOCX..."):
                    template_bytes = st.session_state.template_bytes_for_download
                    output_docx_bytes = populate_docx_template(template_bytes, final_content_map)
                    
                    if output_docx_bytes:
                        st.session_state.final_docx_bytes = output_docx_bytes
                        st.session_state.final_file_name = st.session_state.file_name_info
                        st.session_state.generated_content = None
                        st.session_state.template_bytes_for_download = None
                        st.session_state.file_name_info = None
                        st.success("Download ready!")
                        st.rerun()
                        
    # Download button
    if st.session_state.final_docx_bytes:
        st.download_button(
            label="📥 Download Final ICF (.docx)",
            data=st.session_state.final_docx_bytes,
            file_name=st.session_state.final_file_name,
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            use_container_width=True,
            on_click=lambda: st.session_state.update(final_docx_bytes=None, final_file_name=None)
        )
        st.info("Click to download. Button will disappear after clicking.")


# --- TAB 2: REVIEW MODE ---
with tab_review:
    st.header("Review Existing ICF (Using Claude API)")
    
    with st.form("review_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Source Documents")
            protocol_file_review = st.file_uploader(
                "1. Upload Protocol", 
                type=["pdf", "docx", "json", "xml"], 
                key="protocol_rev"
            )
            template_options_rev = list(st.session_state.templates.keys())
            selected_template_name_rev = None
            if template_options_rev:
                selected_template_name_rev = st.selectbox(
                    "2. Select IRB Template",
                    options=template_options_rev,
                    key="template_rev"
                )

        with col2:
            st.subheader("ICF to Review")
            existing_icf_docx = st.file_uploader(
                "3. Upload Existing ICF (DOCX)", 
                type="docx", 
                key="docx_rev"
            )

        review_submitted = st.form_submit_button("🔍 Analyze with Claude", type="primary", use_container_width=True)

    if review_submitted:
        template_info_rev = None
        if selected_template_name_rev:
            template_info_rev = st.session_state.templates[selected_template_name_rev]
            
        if protocol_file_review and existing_icf_docx and template_info_rev:
            if not os.environ.get("ANTHROPIC_API_KEY"):
                st.error("Please set the `ANTHROPIC_API_KEY` environment variable to use the AI functionality.")
            else:
                with st.spinner("🤖 Claude is analyzing documents..."):
                    # Extract protocol text
                    protocol_bytes = protocol_file_review.getvalue()
                    file_ext = protocol_file_review.name.split('.')[-1].lower()
                    
                    if file_ext == "pdf":
                        protocol_text = extract_text_from_pdf(protocol_bytes)
                    elif file_ext == "docx":
                        protocol_text = extract_text_from_docx(protocol_bytes)
                    else:
                        protocol_text = protocol_bytes.decode('utf-8')
                    
                    protocol_data = parse_protocol_with_claude(protocol_text, file_ext)

                    # Extract ICF text
                    icf_bytes = existing_icf_docx.getvalue()
                    icf_text = extract_text_from_docx(icf_bytes)

                    # Parse approved language if exists
                    approved_language_data = {}
                    if "language_bytes" in template_info_rev:
                        lang_bytes = template_info_rev["language_bytes"]
                        lang_ext = template_info_rev["language_filename"].split('.')[-1].lower()
                        
                        if lang_ext == "pdf":
                            lang_text = extract_text_from_pdf(lang_bytes)
                        elif lang_ext == "docx":
                            lang_text = extract_text_from_docx(lang_bytes)
                        else:
                            lang_text = lang_bytes.decode('utf-8')
                        
                        approved_language_data = parse_approved_language_with_claude(
                            lang_text, template_info_rev["language_filename"]
                        )
                    
                    # Analyze
                    analysis_result = analyze_icf_with_claude(
                        protocol_data, 
                        approved_language_data, 
                        icf_text
                    )
                    
                    st.session_state.analysis_result = analysis_result
                    st.success("✅ Analysis Complete!")
        else:
            st.error("🚫 Please upload a Protocol, select a Template, and upload the ICF for review.")

    if "analysis_result" in st.session_state and st.session_state.analysis_result:
        analysis_result = st.session_state.analysis_result
        st.divider()
        st.header("Analysis Report")

        col_a1, col_a2 = st.columns(2)
        with col_a1:
            st.metric("Estimated Readability (AI)", f"Grade Level {analysis_result.get('overall_score', 'N/A')}")
        with col_a2:
            st.metric("Readability Tool Score (Flesch-Kincaid)", f"{textstat.flesch_kincaid_grade(icf_text) if icf_text and len(icf_text) > 50 else 'N/A'}")

        st.subheader("Gaps and Missing Information")
        if analysis_result.get("gaps"):
            for gap in analysis_result["gaps"]:
                st.warning(f"• {gap}")
        else:
            st.success("No significant gaps or missing protocol information identified by the AI.")
            
        st.subheader("Improvement Suggestions")
        suggestions = analysis_result.get("suggestions", [])
        if suggestions:
            for s in suggestions:
                st.info(f"**Section: {s.get('section', 'General')}**\n- **Issue:** {s.get('issue', 'N/A')}\n- **Suggestion:** {s.get('suggestion', 'N/A')}")
        else:
            st.success("No critical improvement suggestions identified.")

        st.subheader("Section Readability Breakdown")
        readability_report = analysis_result.get("readability_report", [])
        if readability_report:
            df = pd.DataFrame(readability_report)
            st.dataframe(df.style.highlight_max(axis=0, subset=['score'], color='#ff9999').highlight_min(axis=0, subset=['score'], color='#ccffcc'), use_container_width=True)


# --- TAB 3: SUMMARIZER MODE (CORRECTED) ---
with tab_summarize:
    st.header("Patient-Friendly Summarizer (Using Claude API)")

    # 1. Clear session state variables related to summarization on fresh tab load (optional, but good)
    if "summaries" not in st.session_state:
        st.session_state.summaries = None
    if "icf_text_for_summarize" not in st.session_state:
        st.session_state.icf_text_for_summarize = ""

    with st.form("summarize_form"):
        col_s1, col_s2 = st.columns(2)
        
        with col_s1:
            icf_file_summarize = st.file_uploader(
                "1. Upload Completed ICF (DOCX)", 
                type="docx", 
                key="icf_sum"
            )
        
        with col_s2:
            target_grade = st.selectbox(
                "2. Select Target Reading Level",
                options=["6th Grade", "8th Grade"],
                key="target_grade_sum"
            )
            
        summarize_submitted = st.form_submit_button("✍️ Generate Summaries", type="primary", use_container_width=True)
        
    if summarize_submitted:
        if icf_file_summarize:
            if not os.environ.get("ANTHROPIC_API_KEY"):
                st.error("Please set the `ANTHROPIC_API_KEY` environment variable to use the AI functionality.")
            else:
                with st.spinner("🤖 Creating patient summaries..."):
                    icf_bytes = icf_file_summarize.getvalue()
                    icf_text = extract_text_from_docx(icf_bytes)
                    
                    if icf_text:
                        # 🔑 FIX 1: Store extracted text in session state
                        st.session_state.icf_text_for_summarize = icf_text
                        
                        sections_to_summarize = parse_docx_sections_from_text(icf_text)
                        
                        summaries = summarize_icf_with_claude(sections_to_summarize, st.session_state.target_grade_sum)
                        st.session_state.summaries = summaries
                        st.success("✅ Summaries Complete!")
                    else:
                        st.error("Could not extract text from the ICF file.")
        else:
            st.error("Please upload an ICF document.")

    # 🔑 FIX 2: Safely access summaries from session state
    if st.session_state.summaries:
        st.divider()
        st.header(f"Patient Summary (Target: {st.session_state.target_grade_sum})")
        
        # Display the summaries
        for heading, summary in st.session_state.summaries.items():
            st.markdown(f"**{heading} Summary:**")
            st.write(summary)
            
        # Optional: Add a text area display of the full original ICF text used for the summary
        st.divider()
        with st.expander("Review Original ICF Text (for reference)"):
            st.text_area("Original ICF Content", st.session_state.icf_text_for_summarize, height=300, label_visibility="collapsed")
