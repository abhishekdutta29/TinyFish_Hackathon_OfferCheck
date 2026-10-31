export interface SampleOffer {
  id: string;
  name: string;
  description: string;
  company_name: string;
  sender_email: string;
  website_url: string;
  phone: string;
  payment_demanded: boolean;
  payment_amount: string;
  mentions_interview: boolean;
  stipend: string;
  text: string;
}

export const SAMPLE_OFFERS: SampleOffer[] = [
  {
    id: "scam",
    name: "Scam Offer (Rs 3,000 Fee + Gmail + Urgent)",
    description: "Fake internship offer demanding registration fee via personal Gmail address",
    company_name: "Apex Global Tech Solutions",
    sender_email: "hr.apextechsolutions2026@gmail.com",
    website_url: "http://www.apexglobal-tech-jobportal.xyz",
    phone: "+91 91234 56789",
    payment_demanded: true,
    payment_amount: "Rs 3,000",
    mentions_interview: false,
    stipend: "Rs 65,000 per month",
    text: `Subject: URGENT: Direct Selection Letter - Software Developer Intern at Apex Global Tech Solutions

Dear Candidate,

Congratulations! We are pleased to inform you that your resume has been shortlisted directly from our database for the position of Software Development Intern at Apex Global Tech Solutions.

Key Details of Internship:
- Role: Python & Full Stack Developer Intern
- Monthly Stipend: Rs. 65,000 per month (Guaranteed high stipend for freshers)
- Selection Process: Direct Selection without Interview based on academic profile
- Duration: 6 Months (Remote / Work from Home)

IMPORTANT INSTRUCTIONS (URGENT):
Due to limited seats (only 3 seats left), you must immediately confirm your seat by depositing a mandatory refundable registration and laptop dispatch security fee of Rs. 3,000 today. 

Please transfer Rs 3,000 immediately to our company accounts coordinator via UPI (apextech.hr@upi) or Bank Transfer within 24 hours. This is your last chance. If payment is not received immediately, your offer will be cancelled and offered to the next candidate on the waiting list.

Send payment screenshot to our recruitment coordinator at:
Email: hr.apextechsolutions2026@gmail.com
Phone: +91 91234 56789
Website: http://www.apexglobal-tech-jobportal.xyz

Welcome aboard!
HR Recruitment Team
Apex Global Tech Solutions`
  },
  {
    id: "genuine",
    name: "Genuine Offer (Infosys Campus Offer - Corporate Domain + Interview)",
    description: "Legitimate corporate offer letter with interview rounds and zero fees",
    company_name: "Infosys Limited",
    sender_email: "talent.acquisition@infosys.com",
    website_url: "https://www.infosys.com",
    phone: "+91 80 2852 0261",
    payment_demanded: false,
    payment_amount: "",
    mentions_interview: true,
    stipend: "Rs 28,000 per month",
    text: `Offer of Employment: Systems Engineer Trainee

Ref: INF/2026/SE/BLR-0941
Date: October 24, 2026

Dear Candidate,

Following your successful performance in the National Qualifier Assessment and subsequent Technical and HR Interview rounds conducted on October 18, 2026, we are delighted to extend this offer of employment with Infosys Limited.

Position: Systems Engineer Trainee
Base Location: Bangalore Development Centre, Electronics City, Hosur Road, Bangalore - 560100
Compensation & Stipend: Rs. 28,000 per month during foundation training, transitioning to CTC of INR 4,20,000 per annum upon completion.

Terms and Conditions:
1. Joining & Induction: Your induction will commence on December 1, 2026 at the Infosys Mysore Global Education Centre.
2. Background Verification: Employment is subject to successful verification of educational credentials and standard background checks.
3. Zero Fee Policy: Infosys does not charge any fee at any stage of the recruitment process (application, interview, processing, or training). Any solicitation of funds in the name of Infosys is unauthorized and fraudulent.

Please review and accept this offer letter via the Infosys Career Portal within 7 calendar days.

For any queries regarding onboarding, please contact:
HR Talent Acquisition Team
Infosys Limited
Email: talent.acquisition@infosys.com
Website: https://www.infosys.com
Registered Office: Electronics City, Hosur Road, Bengaluru 560 100, India
Phone: +91 80 2852 0261`
  }
];
