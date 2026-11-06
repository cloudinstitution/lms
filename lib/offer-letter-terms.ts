export interface OfferTerms { probation_months: number; notice_months: number; min_service_months: number; casual_leaves: number; sick_leaves: number }

export interface TermsSection { title: string; paras: string[] }

const words = (n: number) => ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][n] ?? String(n)
const num = (n: number) => `${words(n)} (${n})`

/** Standard terms and conditions printed after the offer. Sections 1–6 come before the compensation table, 7–10 after it. */
export function offerTerms(co: string, t: OfferTerms): { before: TermsSection[]; after: TermsSection[]; witness: string } {
  const paid = t.casual_leaves + t.sick_leaves
  return {
    before: [
      { title: "1. No Alternate Employment, No Conflict, Etc:", paras: [
        `During your employment with the Company, you shall not, without the Company's prior written consent, directly or indirectly employ or engage with any other person, business or entity, whether or not for any gain or profit, irrespective of whether it is during or outside your hours of work in the Company. Additionally, you are not allowed to undertake any other gainful employment, engagement, business, assume any public office or private office, honorary or remunerative position, without prior written permission of the Company. During your employment with the Company, you shall not directly or indirectly engage in any conduct in conflict with or averse to the best interests of the Company, as determined by the Company at its sole discretion. In addition, you shall not disclose, divulge or bring on to ${co} systems or office, your prior employer's and/or their clients' proprietary or confidential information, or violate any agreement or obligations that you have with them.`] },
      { title: "2. Confidentiality:", paras: [
        `During your employment, you may access confidential information about the Company, its affiliates, clients, or third parties, which must remain strictly confidential. Disclosure is prohibited without the Company's written consent, and any breach may result in termination and legal action. This confidentiality obligation continues even after employment ends. You may not make copies of confidential information without permission, and all copies must be returned upon termination. Additionally, you must not engage in any actions, during or after employment, that could harm the Company's business or reputation. You are expected to adhere to the ${co} social media policy and avoid posting any harmful, offensive, or disparaging content regarding clients, associates, or competitors. The Company may also require you to sign additional confidentiality agreements when working on certain client projects.`] },
      { title: "3. Work Schedule:", paras: [
        `The Company's standard working hours are 9 hours per day, excluding breaks, within the limits set by applicable laws. Extended hours, including weekends, may be required based on project needs, subject to legal limits. Any changes to working hours will be communicated to you.`] },
      { title: "4. Employment Policies:", paras: [
        `During the employment period, employees will be placed on a probation period of ${num(t.probation_months)} months from the date of joining. Upon successful completion of the probation period, their employment will be confirmed as per company policy. Employees are required to serve a ${num(t.notice_months)} month notice period in accordance with company protocol. If an employee fails to serve the full notice period, the company reserves the right to withhold the salary of the previous month, experience certificates and employment-related documents. Additionally, employees must complete a minimum service period of ${t.min_service_months} months with the company.`] },
      { title: "5. Compliance with Company Policies:", paras: [
        `As a condition of employment with the Company and as part of your joining formalities, you are required to comply or execute the following Company agreement and attest your understanding and adherence to following Company policies:`,
        `•  Code of Business Ethics\n•  Acceptable Use Policy and Social Media Policy\n•  Dress Code Policy`] },
      { title: "6. Unauthorized Absence:", paras: [
        `If you are absent from work for a continuous period of three (3) days or as prescribed by applicable laws, without the prior written consent from your approving authority, it will be construed that you have voluntarily abandoned your employment with the Company. The Company shall be entitled to take appropriate disciplinary action(s) against you as per the Company's Job Abandonment Policy.`] },
    ],
    after: [
      { title: "7. Leave and vacation:", paras: [
        `From your date of joining, you will be entitled to the following leave amounts as per your eligibility in line with statutory requirements. Leaves require manager approval in advance.`,
        `Employees are entitled to ${paid} paid leave days per year, which includes ${t.casual_leaves} Casual Leave (CL) days and ${t.sick_leaves} Sick Leave (SL) days. Any unused leave balance will be carried forward as per company policy. However, if an employee avails leave beyond the eligible balance, the excess leave will be treated as unpaid leave.`,
        `During the notice period, employees are not permitted to take leave without prior approval. All the leaves during the notice period are considered to be a loss of pay, and any leave taken may result in an extension of the notice period, subject to company policy and applicable laws.`,
        `Once the employee submits their resignation, all pending leaves will be forfeited during the notice period.`] },
      { title: "8. Duties and Responsibilities:", paras: [
        `a)  You agree that at all times during your employment with ${co}, you will faithfully, industriously, and to the best of your skill, ability, experience and talent, perform any and all of the duties required of your position. In carrying out these duties and responsibilities, you shall comply with all policies, procedures, rules and regulations, both written and oral, as are announced or implemented by the Company from time to time, and shall honor and comply with all rules and statutory requirements under applicable law as amended from time to time, in letter and spirit.`,
        `b)  Your unprofessional behavior or misconduct in violation of the ${co} Code of Business Ethics and/or other organizational policies shall entitle the Company to take appropriate disciplinary action(s) including termination of your employment.`,
        `c)  You shall, at all times, maintain satisfactory performance and upskill yourself in accordance with the business requirements of the Company. Unsatisfactory or poor performance shall entitle the Company to take appropriate disciplinary action(s) including termination of your employment.`] },
      { title: "9. Termination Policy:", paras: [
        `Either the Company or the Employee may terminate this agreement by providing ${words(t.notice_months)} months' written notice. The Company reserves the right to terminate the Employee's employment immediately, without prior notice, in cases of serious misconduct, violation of company policies, inappropriate behavior, breach of confidentiality, or consistent failure to meet performance standards.`,
        `In the event of termination by the Company, any severance package or additional compensation, if applicable, shall be determined at the Company's discretion, subject to the terms of the employment agreement and applicable laws.`] },
      { title: "10. General:", paras: [
        `This Agreement and your employment are personal to you and may not be assigned or transferred. Any delay or failure by the Company to exercise its rights does not waive those rights. If any provision is deemed invalid, the remaining terms remain unaffected. You may not make announcements or disclose any Company information, intellectual property, or the names of affiliates, employees, contractors, or clients without prior written consent. This Agreement, along with Company policies and your Employment Offer Letter, constitutes the entire agreement between the parties, superseding all prior discussions. You must keep the terms of this Agreement strictly confidential. The Company reserves the right to amend this Agreement as required by law or business needs.`] },
    ],
    witness: "IN WITNESS WHEREOF, the Parties hereto have duly executed this Agreement as of the day and year first above written.",
  }
}
