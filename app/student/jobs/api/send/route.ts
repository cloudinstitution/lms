import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

// ============================================
// CONFIGURATION
// ============================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const EMAIL_DELAY = 1000 // 1 second between emails
const MAX_EMAIL_RETRIES = 3


// ============================================
// SIMPLE EMAIL QUEUE
// ============================================

type EmailTask = {
  transporter: nodemailer.Transporter
  mailUser: string
  mailTo: string
  email: string
  jobTitle: string
  name: string
  html: string
  resumeName: string
  resumeBuffer: Buffer
  resumeType: string
  resolve: () => void
  reject: (error: unknown) => void
}

const emailQueue: EmailTask[] = []

let isProcessingQueue = false


// ============================================
// DELAY
// ============================================

function delay(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  )
}


// ============================================
// PROCESS EMAIL QUEUE
// ============================================

async function processEmailQueue() {

  if (isProcessingQueue) {
    return
  }

  isProcessingQueue = true

  try {

    while (emailQueue.length > 0) {

      const task = emailQueue.shift()

      if (!task) {
        continue
      }

      let sent = false
      let lastError: unknown = null

      // ========================================
      // RETRY EMAIL UP TO 3 TIMES
      // ========================================

      for (
        let attempt = 1;
        attempt <= MAX_EMAIL_RETRIES;
        attempt++
      ) {

        try {

          await task.transporter.sendMail({

            from:
              `"LMS Job Portal" <${task.mailUser}>`,

            to: task.mailTo,

            replyTo: task.email,

            subject:
              `Job Application - ${task.jobTitle} - ${task.name}`,

            html: task.html,

            attachments: [
              {
                filename: task.resumeName,
                content: task.resumeBuffer,
                contentType: task.resumeType,
              },
            ],

          })

          sent = true

          console.log(
            `Application email sent successfully: ${task.name}`
          )

          break

        } catch (error) {

          lastError = error

          console.error(
            `Email attempt ${attempt}/${MAX_EMAIL_RETRIES} failed:`,
            error
          )

          if (
            attempt <
            MAX_EMAIL_RETRIES
          ) {

            await delay(
              attempt * 2000
            )

          }

        }

      }


      // ========================================
      // FINISH TASK
      // ========================================

      if (sent) {

        task.resolve()

      } else {

        task.reject(lastError)

      }


      // ========================================
      // WAIT BEFORE NEXT EMAIL
      // ========================================

      if (emailQueue.length > 0) {

        await delay(
          EMAIL_DELAY
        )

      }

    }

  } finally {

    isProcessingQueue = false

  }

}


// ============================================
// ADD EMAIL TO QUEUE
// ============================================

function queueEmail(
  task: Omit<
    EmailTask,
    "resolve" | "reject"
  >
): Promise<void> {

  return new Promise(
    (resolve, reject) => {

      emailQueue.push({

        ...task,

        resolve,

        reject,

      })

      processEmailQueue()

    }
  )

}


// ============================================
// POST
// ============================================

export async function POST(
  request: Request
) {

  try {

    // ========================================
    // CHECK ENVIRONMENT VARIABLES
    // ========================================

    const mailUser =
      process.env.GMAIL_USER

    const mailPassword =
      process.env.GMAIL_APP_PASSWORD

    const mailTo =
      process.env.GMAIL_TO ||
      process.env.MAIL_TO


    if (
      !mailUser ||
      !mailPassword ||
      !mailTo
    ) {

      console.error(
        "Mail environment variables are missing"
      )

      return NextResponse.json(
        {
          success: false,
          message:
            "Mail server configuration is missing",
        },
        {
          status: 500,
        }
      )

    }


    // ========================================
    // GET FORM DATA
    // ========================================

    const formData =
      await request.formData()


    const name =
      String(
        formData.get("name") || ""
      ).trim()


    const email =
      String(
        formData.get("email") || ""
      ).trim()


    const phone =
      String(
        formData.get("phone") || ""
      ).trim()


    const experience =
      String(
        formData.get("experience") || ""
      ).trim()


    const studentId =
      String(
        formData.get("studentId") || ""
      ).trim()


    const jobId =
      String(
        formData.get("jobId") || ""
      ).trim()


    const jobTitle =
      String(
        formData.get("jobTitle") || ""
      ).trim()


    const company =
      String(
        formData.get("company") || ""
      ).trim()


    const jobType =
      String(
        formData.get("jobType") || ""
      ).trim()


    const location =
      String(
        formData.get("location") || ""
      ).trim()


    const resume =
      formData.get("resume")


    // ========================================
    // BASIC VALIDATION
    // ========================================

    if (!name) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Name is required",
        },
        {
          status: 400,
        }
      )

    }


    if (!email) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Email is required",
        },
        {
          status: 400,
        }
      )

    }


    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/


    if (
      !emailRegex.test(email)
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide a valid email address",
        },
        {
          status: 400,
        }
      )

    }


    if (!phone) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Phone number is required",
        },
        {
          status: 400,
        }
      )

    }


    if (!studentId) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Student ID is required",
        },
        {
          status: 400,
        }
      )

    }


    if (!jobId) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Job ID is required",
        },
        {
          status: 400,
        }
      )

    }


    if (!jobTitle) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Job title is required",
        },
        {
          status: 400,
        }
      )

    }


    if (!company) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Company name is required",
        },
        {
          status: 400,
        }
      )

    }


    // ========================================
    // RESUME VALIDATION
    // ========================================

    if (
      !(resume instanceof File)
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Resume is required",
        },
        {
          status: 400,
        }
      )

    }


    if (
      resume.size === 0
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Resume file is empty",
        },
        {
          status: 400,
        }
      )

    }


    if (
      resume.size >
      MAX_FILE_SIZE
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Resume must be smaller than 5 MB",
        },
        {
          status: 400,
        }
      )

    }


    if (
      !ALLOWED_FILE_TYPES.includes(
        resume.type
      )
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Only PDF, DOC, and DOCX resumes are allowed",
        },
        {
          status: 400,
        }
      )

    }


    // ========================================
    // CREATE TRANSPORTER
    // ========================================

    const transporter =
      nodemailer.createTransport({

        service: "gmail",

        auth: {

          user: mailUser,

          pass: mailPassword,

        },

      })


    // ========================================
    // RESUME BUFFER
    // ========================================

    const resumeBuffer =
      Buffer.from(
        await resume.arrayBuffer()
      )


    // ========================================
    // EMAIL HTML
    // ========================================

    const html = `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<style>

body {
  margin: 0;
  padding: 0;
  background-color: #f4f5f7;
  font-family: Arial, Helvetica, sans-serif;
  color: #334155;
}

.wrapper {
  width: 100%;
  padding: 30px 15px;
  box-sizing: border-box;
}

.container {
  max-width: 680px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.header {
  background: linear-gradient(
    135deg,
    #7c3aed,
    #9333ea
  );

  padding: 32px 30px;
  color: #ffffff;
}

.header-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
}

.header-subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: #ede9fe;
}

.content {
  padding: 30px;
}

.section {
  margin-bottom: 28px;
}

.section-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 700;
  color: #475569;
}

.job-card {
  background: #faf5ff;
  border: 1px solid #e9d5ff;
  border-radius: 12px;
  padding: 20px;
}

.job-title {
  margin: 0 0 12px;
  color: #6d28d9;
  font-size: 20px;
  font-weight: 700;
}

.info-row {
  padding: 9px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  display: inline-block;
  min-width: 110px;
  color: #64748b;
  font-weight: 600;
}

.value {
  color: #1e293b;
}

.student-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  background: #ffffff;
}

.student-name {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.experience-box {
  background: #f8fafc;
  border-left: 4px solid #7c3aed;
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  color: #475569;
}

.resume-box {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  padding: 16px;
  color: #065f46;
  font-size: 14px;
}

.resume-title {
  font-weight: 700;
  margin-bottom: 5px;
}

.footer {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 20px 30px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.badge {
  display: inline-block;
  background: #ede9fe;
  color: #6d28d9;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

</style>

</head>

<body>

<div class="wrapper">

<div class="container">

<div class="header">

<h1 class="header-title">
New Job Application
</h1>

<p class="header-subtitle">
A new student application has been submitted through the placement portal.
</p>

</div>


<div class="content">


<div class="section">

<h3 class="section-title">
💼 Job Details
</h3>

<div class="job-card">

<h2 class="job-title">
${escapeHtml(jobTitle)}
</h2>

<div class="info-row">

<span class="label">
Company
</span>

<span class="value">
${escapeHtml(company)}
</span>

</div>


<div class="info-row">

<span class="label">
Job ID
</span>

<span class="value">
${escapeHtml(jobId)}
</span>

</div>


<div class="info-row">

<span class="label">
Job Type
</span>

<span class="value">
${escapeHtml(jobType || "Not specified")}
</span>

</div>


<div class="info-row">

<span class="label">
Location
</span>

<span class="value">
${escapeHtml(location || "Not specified")}
</span>

</div>

</div>

</div>


<div class="section">

<h3 class="section-title">
👤 Applicant Details
</h3>

<div class="student-card">

<div class="student-name">
${escapeHtml(name)}
</div>

<div class="info-row">

<span class="label">
Email
</span>

<span class="value">
${escapeHtml(email)}
</span>

</div>

<div class="info-row">

<span class="label">
Phone
</span>

<span class="value">
${escapeHtml(phone)}
</span>

</div>

<div class="info-row">

<span class="label">
Student ID
</span>

<span class="value">
${escapeHtml(studentId)}
</span>

</div>

</div>

</div>


<div class="section">

<h3 class="section-title">
📝 Experience & Skills
</h3>

<div class="experience-box">

${
  experience
    ? escapeHtml(
        experience
      ).replace(
        /\n/g,
        "<br />"
      )
    : "No experience or skills information was provided."
}

</div>

</div>


<div class="section">

<div class="resume-box">

<div class="resume-title">
📎 Resume Attached
</div>

<div>
The applicant's resume has been attached to this email.
</div>

</div>

</div>


</div>


<div class="footer">

<strong>
Student Placement Portal
</strong>

<br />

This is an automated job application notification.

</div>

</div>

</div>

</body>
</html>
`


    // ========================================
    // ADD EMAIL TO QUEUE
    // ========================================

    await queueEmail({

      transporter,

      mailUser,

      mailTo,

      email,

      jobTitle,

      name,

      html,

      resumeName:
        resume.name,

      resumeBuffer,

      resumeType:
        resume.type,

    })


    // ========================================
    // SUCCESS
    // ========================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Application submitted successfully",
      },
      {
        status: 200,
      }
    )


  } catch (error) {

    console.error(
      "Job application email error:",
      error
    )

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to send job application",
      },
      {
        status: 500,
      }
    )

  }

}


// ============================================
// HTML ESCAPE
// ============================================

function escapeHtml(
  value: string
) {

  return value

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    )

}