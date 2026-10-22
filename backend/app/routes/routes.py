import io
import traceback
import logging
import tempfile
import os
from flask import Blueprint, request, jsonify, send_file
from playwright.sync_api import sync_playwright
from werkzeug.exceptions import RequestEntityTooLarge
from app.groq_analyzer import analyze_resume_with_groq, extract_text_from_pdf, extract_text_from_docx, test_groq_connection
from app.rate_limit import DailyLimiter

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

routes = Blueprint('routes', __name__)

@routes.route("/", methods=["GET"])
def home():
    """Health check endpoint"""
    return jsonify({
        "status": "running",
        "message": "Resume AI backend is running with Groq!"
    })

@routes.route("/health", methods=["GET"])
def health_check():
    """Comprehensive health check including Groq connectivity"""
    try:
        groq_status = test_groq_connection()
        return jsonify({
            "status": "healthy" if groq_status else "degraded",
            "groq_connected": groq_status,
            "message": "All systems operational" if groq_status else "Groq API connection issue"
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "groq_connected": False,
            "error": str(e)
        }), 500

# One scan is the most expensive thing this backend does: roughly 3,000 of
# the ~200k tokens Groq allows per day. Without a per-caller cap a single
# visitor could spend the whole budget, so the rest of the day returns
# errors for everyone else.
ANALYSES_PER_DAY = int(os.environ.get("ANALYSES_PER_DAY", "5"))
analysis_limiter = DailyLimiter(ANALYSES_PER_DAY, name="resume scan")


@routes.route("/analyze", methods=["POST", "OPTIONS"])
def analyze_resume_api():
    """Analyze resume against a target job using Gemini AI."""
    if request.method == "OPTIONS":
        return "", 200

    try:
        allowed, quota = analysis_limiter.check()
        if not allowed:
            hours, rem = divmod(quota["resets_in_seconds"], 3600)
            return jsonify({
                "error": (
                    f"You have used all {quota['limit']} resume scans for today. "
                    f"The next one unlocks in {hours}h {rem // 60}m."
                ),
                "rate_limit": quota,
            }), 429

        if "file" not in request.files:
            # Nothing was analysed, so do not charge the scan.
            analysis_limiter.refund()
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        job_title = request.form.get("target_job", "").strip().lower()
        job_description = request.form.get("job_description", "").strip()

        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.docx')):
            analysis_limiter.refund()
            return jsonify({"error": "Only PDF and DOCX files are supported"}), 400

        # Save file to a temporary location
        suffix = os.path.splitext(file.filename)[-1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        logger.info(f"Saved uploaded file to {tmp_path}")
        logger.info(f"Analyzing for job: {job_title}")
        if job_description:
            logger.info(f"Job description provided: {job_description[:100]}...")

        # Run Groq-powered analysis with job description
        result = analyze_resume_with_groq(
            file_path=tmp_path, 
            job_title=job_title, 
            job_skills=None,  # Always None - let Gemini decide
            job_description=job_description if job_description else None
        )

        # Clean up temp file
        os.remove(tmp_path)
        logger.info("Analysis completed successfully")

        result["rate_limit"] = quota
        return jsonify(result)

    except RequestEntityTooLarge:
        analysis_limiter.refund()
        return jsonify({"error": "File too large. Maximum allowed size is 10MB."}), 413

    except Exception as e:
        # Clean up temp file if it exists
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        
        # A failed analysis is not a scan the user got anything from.
        analysis_limiter.refund()
        logger.error(f"Unexpected error in /analyze: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Analysis failed: {str(e)}",
            "skills": [],
            "projects": [],
            "projects_with_skills": {},
            "quantifiable_impacts": {},
            "relevant_projects": [],
            "analysis": {
                "total_skills_found": 0,
                "total_projects": 0,
                "relevant_projects": 0,
                "skills_with_metrics": 0,
                "achieved_score": 0,
                "max_possible_score": 100
            }
        }), 500

@routes.route("/analyze-multiple-jobs", methods=["POST"])
def analyze_multiple_jobs():
    """Analyze resume against multiple job roles using Gemini AI."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        jobs_str = request.form.get("target_jobs")

        if not jobs_str:
            return jsonify({"error": "target_jobs is required"}), 400

        target_jobs = [job.strip().lower() for job in jobs_str.split(",") if job.strip()]

        if not target_jobs:
            return jsonify({"error": "At least one target job is required"}), 400

        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.docx')):
            return jsonify({"error": "Only PDF and DOCX files are supported"}), 400

        # Save file temporarily
        suffix = os.path.splitext(file.filename)[-1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        logger.info(f"Analyzing resume against multiple jobs: {target_jobs}")

        results = {}
        for job in target_jobs:
            try:
                # Get job description if provided
                job_description = request.form.get(f"{job}_description", "").strip()
                
                # Analyze with Groq - let it determine required skills
                result = analyze_resume_with_groq(
                    file_path=tmp_path, 
                    job_title=job, 
                    job_skills=None,  # Let Gemini decide
                    job_description=job_description if job_description else None
                )
                results[job] = result
                logger.info(f"Completed analysis for {job}")
                
            except Exception as job_error:
                logger.error(f"Error analyzing for job {job}: {str(job_error)}")
                results[job] = {
                    "error": f"Failed to analyze for {job}: {str(job_error)}",
                    "skills": [],
                    "projects": [],
                    "projects_with_skills": {},
                    "quantifiable_impacts": {},
                    "relevant_projects": [],
                    "analysis": {
                        "total_skills_found": 0,
                        "total_projects": 0,
                        "relevant_projects": 0,
                        "skills_with_metrics": 0,
                        "achieved_score": 0,
                        "max_possible_score": 100
                    }
                }

        # Clean up
        os.remove(tmp_path)

        return jsonify(results)

    except Exception as e:
        # Clean up temp file if it exists
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
            
        logger.error(f"Error in /analyze-multiple-jobs: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@routes.route("/project-highlights", methods=["POST"])
def get_project_highlights():
    """Return only project-related insights from the resume using Gemini AI."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        job_title = request.form.get("target_job", "").strip().lower()
        job_description = request.form.get("job_description", "").strip()

        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.docx')):
            return jsonify({"error": "Only PDF and DOCX files are supported"}), 400

        # Save temporarily
        suffix = os.path.splitext(file.filename)[-1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Run analysis with Groq - let it determine skills based on job
        result = analyze_resume_with_groq(
            file_path=tmp_path, 
            job_title=job_title if job_title else None, 
            job_skills=None,  # Let Gemini decide
            job_description=job_description if job_description else None
        )

        # Clean up
        os.remove(tmp_path)

        # Extract just the project highlights
        highlights = result.get("projects_with_skills", {})
        impacts = result.get("quantifiable_impacts", {})

        return jsonify({
            "projects": highlights,
            "impacts": impacts,
            "total_projects": len(highlights),
            "projects_with_metrics": len(impacts)
        })

    except Exception as e:
        # Clean up temp file if it exists
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
            
        logger.error(f"Error in /project-highlights: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@routes.route("/skills-only", methods=["POST"])
def extract_skills_only():
    """Extract only skills from resume using Gemini AI."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]

        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.docx')):
            return jsonify({"error": "Only PDF and DOCX files are supported"}), 400

        # Save temporarily
        suffix = os.path.splitext(file.filename)[-1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Run basic analysis with Groq (no job matching)
        result = analyze_resume_with_groq(file_path=tmp_path)

        # Clean up
        os.remove(tmp_path)

        return jsonify({
            "skills": result.get("skills", []),
            "total_skills": len(result.get("skills", []))
        })

    except Exception as e:
        # Clean up temp file if it exists
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
            
        logger.error(f"Error in /skills-only: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@routes.route("/debug/test-analyzer", methods=["GET"])
def test_analyzer():
    """Debug endpoint to ensure Groq analyzer works."""
    try:
        groq_status = test_groq_connection()
        return jsonify({
            "status": "success" if groq_status else "error",
            "message": "Groq analyzer is working" if groq_status else "Groq connection failed",
            "groq_connected": groq_status
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@routes.route("/generate-pdf", methods=["POST", "OPTIONS"])
def generate_pdf():
    """Generate PDF from HTML content using Playwright"""
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        data = request.get_json()
        html_content = data.get('html')
        css_content = data.get('css', '')
        layout_settings = data.get('layoutSettings', {})
        
        if not html_content:
            return jsonify({'error': 'HTML content is required'}), 400

        logger.info("Starting PDF generation")
        logger.info(f"HTML content length: {len(html_content)}")
        logger.info(f"CSS content length: {len(css_content)}")

        # Extract layout settings with defaults
        margins = layout_settings.get('margins', {})
        margin_top = f"{margins.get('top', 20)}px"
        margin_right = f"{margins.get('right', 20)}px"
        margin_bottom = f"{margins.get('bottom', 20)}px"
        margin_left = f"{margins.get('left', 20)}px"
        
        page_size = layout_settings.get('pageSize', 'A4')
        font_family = layout_settings.get('fontFamily', '"CMU Serif", "Computer Modern Serif", Georgia, serif')

        # The preview puts these on the page wrapper, but the client sends only
        # .resume-content - which sits inside that wrapper - so they have to be
        # reapplied here or the PDF silently uses 16px/1.5 instead.
        font_size = layout_settings.get('fontSize', 12)
        line_height = layout_settings.get('lineHeight', '1.2')

        # Construct full HTML document with embedded styles
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @import url('https://cdn.jsdelivr.net/gh/vsalvino/computer-modern@main/fonts/serif.css');
                
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                
                body {{
                    font-family: {font_family};
                    background: white;
                    color: black;
                }}
                
                /* Force text-center to work */
                .text-center {{
                    text-align: center !important;
                }}
                
                /* Ensure flex and spacing work */
                .flex {{
                    display: flex !important;
                }}
                
                .justify-between {{
                    justify-content: space-between !important;
                }}
                
                .items-baseline {{
                    align-items: baseline !important;
                }}
                
                a {{
                    color: rgb(0, 51, 153);
                    text-decoration: none;
                }}
                
                /* Preserve inline styles */
                [style*="text-align: center"] {{
                    text-align: center !important;
                }}
                
                {css_content}

                /* Last word, after the harvested rules. The client sends every
                   stylesheet it can read, and those belong to a dark-themed
                   app: one of them paints the root black, which showed as a
                   black band under the resume on every page. Printed output is
                   white paper regardless of what the app's theme says. */
                html, body {{
                    background: #ffffff !important;
                    color: #000000 !important;
                }}

                /* The client sends the page box itself, which carries the page
                   size, the margins as padding, and the chosen font size, line
                   height and family as inline styles. Nothing here should
                   contest them - the PDF is meant to be a render of the
                   preview, not a rebuild of it. Page margins are therefore 0
                   below, or the margins would be applied a second time. */
                body {{
                    display: flex;
                    justify-content: center;
                }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # Log a sample of the HTML for debugging
        logger.info(f"Full HTML preview (first 500 chars): {full_html[:500]}")

        # Generate PDF using Playwright
        logger.info("Launching Playwright browser")
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']  # Important for Docker
            )
            page = browser.new_page()
            
            # Set content and wait for it to load
            page.set_content(full_html, wait_until='networkidle')
            
            # Wait for fonts to load
            page.wait_for_timeout(3000)
            
            # Take a screenshot for debugging (optional)
            # screenshot = page.screenshot()
            # logger.info(f"Screenshot size: {len(screenshot)} bytes")
            
            logger.info("Generating PDF")
            pdf_bytes = page.pdf(
                format=page_size,
                print_background=True,
                margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'},
                prefer_css_page_size=False
            )
            
            browser.close()
            logger.info(f"PDF generated successfully, size: {len(pdf_bytes)} bytes")

        # Create in-memory file
        pdf_buffer = io.BytesIO(pdf_bytes)
        pdf_buffer.seek(0)

        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='resume.pdf'
        )

    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500