import Header from "../layouts/Header";
import Footer from "../layouts/Footer";

export default function Page() {
  return (
    <>
      <Header compact />
      <main className="bg-white min-h-screen w-full mx-auto max-w-[1920px] px-6 sm:px-12 lg:px-24 py-12">
        <section className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4  text-black">Privacy Policy</h1>
          <p className="text-sm  mb-8  text-black">
            Effective Date: 10th May, 2025 <br />
            Last Updated: 11th November, 2025
          </p>
          <p className="mb-6 text-black">
           <strong>Jurisdictional Scope:</strong>This Privacy Policy applies globally to all users accessing NeoZaar’s website or services,
           irrespective of their geographic location. For users located outside India, NeoZaar ensures compliance with 
           applicable international data protection laws, including but not limited to the General Data Protection Regulation
           (EU) 2016/679 (“GDPR”), the UK GDPR and Data Protection Act 2018, the California Consumer Privacy Act (CCPA), and 
           other relevant jurisdictional standards, to the extent applicable.

          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">1. Introduction</h2>
          <p className="mb-6  text-black"> 
            This Privacy Policy (“Policy”) governs the manner in which NeoZaar (“Company”, “we”, “our”, or “us”) collects,
            uses, discloses, and protects the personal information of users (“you”, “your”, or “User”) who access or use
            our website {" "}
            <a
              href="https://www.neozaar.com"
              className="text-blue-600 hover:underline"
            >
              www.neozaar.com
            </a> {" "}
             (“Website”) and related services (“Services”).
          </p>

           <p className="mb-6 text-black">
            By accessing, browsing, or using the Website or Services, you acknowledge that you have read, understood, and 
            agree to be bound by the terms of this Privacy Policy. If you do not agree with the terms herein, you are 
            advised to refrain from using the Website or Services.
          </p>

           <p className="mb-6 text-black">
            This Privacy Policy is published in compliance with applicable data protection laws and regulations, including
            but not limited to the Information Technology Act, 2000; the Information Technology (Reasonable Security Practices 
            and Procedures and Sensitive Personal Data or Information) Rules, 2011; the Digital Personal Data Protection Act, 
            2023 (“DPDP Act”); and, where applicable, the General Data Protection Regulation (EU) 2016/679 (“GDPR”) and equivalent 
            laws in other jurisdictions.
          </p>

           <p className="mb-6 text-black">
            For personal data it collects and determines the purposes and means of processing, NeoZaar is the <strong>Data Fiduciary</strong>
            under the DPDP Act (equivalent to a &quot;data controller&quot; under the GDPR). In certain cases NeoZaar acts as a{" "}
            <strong>Data Processor</strong> when processing data on behalf of its partners or enterprise customers, in which case processing
            is governed by an appropriate Data Processing Agreement (DPA).
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">1. Who We Are</h2>
          <p className="mb-6 text-black">
           NeoZaar is a Business-to-Business (B2B) Software-as-a-Service (SaaS) and cloud marketplace platform designed to enable 
           Independent Software Vendors (ISVs), cloud partners, and digital-first startups to accelerate their go-to-market journey.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">The Platform facilitates:</h2>
          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
            <li>
              AI-powered assistants (Nova and Neo) to enhance operational efficiency and user engagement;
            </li>
            <li>
              Private offer creation and management;
            </li>
            <li>
              Marketplace readiness and onboarding support; and
            </li>
            <li>
              Co-sell enablement tools to promote collaborative business growth.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">2. Information We Collect</h2>
          <p className="mb-6 text-black">
           In the course of your interaction with the NeoZaar Platform and Services, we may collect, store, and process the following 
           categories of information, either directly from you or automatically through the use of our systems and tools:
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">a. Personal Information</h2>
          <p className="mb-6 text-black">
            This includes, but is not limited to:
          </p>


          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
            <li>Full name, business or company name, designation, email address, phone number, and communication preferences;</li>
            <li>Account credentials such as usernames, passwords, and authentication tokens; and</li>
            <li>Any other personally identifiable information voluntarily provided by you through registration forms, communications, or platform interactions.</li>
            
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">b. Business Information</h2>
          <p className="mb-6 text-black">
            We may collect business-related details necessary to facilitate marketplace listings, integrations, and co-sell enablement, including:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
            <li>Independent Software Vendor (ISV) product information, service descriptions, and solution categories;</li>
            <li>Partner program preferences, cloud listings, and marketplace readiness data; and</li>
            <li>Any associated business contact or operational information shared for collaboration or onboarding purposes.</li>
            
          </ul>

           <h2 className="text-xl font-semibold mt-6 mb-3 text-black">c. Technical and Analytical Data</h2>
          <p className="mb-6 text-black">
            Collected automatically through cookies, log files, and analytics tools, including:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
            <li>Internet Protocol (IP) address, browser type, operating system, device identifiers, and access timestamps;</li>
            <li>Referring URLs, clickstream data, and general website usage statistics; and</li>
            <li>Information relating to performance monitoring, security diagnostics, and user session analytics.</li>
            
          </ul>

           <h2 className="text-xl font-semibold mt-6 mb-3 text-black">d. AI Interaction Logs</h2>
          <p className="mb-6 text-black">
            In connection with the use of NeoZaar’s AI-powered assistants (Nova and Neo), we may collect:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
            <li>Text queries, prompts, responses, and feedback provided by users;</li>
            <li>Interaction metadata such as frequency, session duration, and engagement history; and</li>
            <li>Data necessary to enhance AI accuracy, personalization, and compliance with ethical AI usage standards.</li>
          </ul>

           <p className="mb-6  text-black">
             All information collected shall be processed strictly in accordance with applicable data protection laws and this Privacy
             Policy, ensuring lawful purpose, data minimization, and limited retention.
           </p>

           <p className="mb-6  text-black">
             Sensitive personal data (such as financial details, biometric data, or government-issued identification) is collected only
             where necessary, with explicit consent, and in accordance with applicable law.
            </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">
            3. How We Use the Information
          </h2>
          <p className="mb-6  text-black">
            NeoZaar shall process, store, and utilize the information collected from Users, Partners, and Visitors solely for lawful and 
            legitimate business purposes. The use of such information shall be limited to the following purposes:
          </p>

           <h5 className="text-base font-semibold mt-6 mb-3 text-black">
           a. Service Provision and Platform Functionality
          </h5>
          <p className="mb-6  text-black">
            To operate, maintain, and improve the NeoZaar Platform, including user account management, authentication, access control, 
            and service personalization.
          </p>

          <h5 className="text-base font-semibold mt-6 mb-3 text-black">
           b. Business Enablement and Partner Collaboration
          </h5>
          <p className="mb-6  text-black">
            To facilitate partner onboarding, ISV listings, co-sell engagements, and cloud marketplace integrations; including verification,
            validation, and commercial coordination between participating entities.
          </p>

          <h5 className="text-base font-semibold mt-6 mb-3 text-black">
            c. Communication and Customer Support
          </h5>
          <p className="mb-6  text-black">
            To communicate with Users for service updates, administrative notices, product announcements, technical support, or feedback
            requests necessary for maintaining service continuity.
          </p>

          <h5 className="text-base font-semibold mt-6 mb-3 text-black">
            d. Marketing and Promotional Activities
          </h5>
          <p className="mb-6  text-black">
            Subject to applicable consent, to provide Users with information regarding new features, offers, partnerships, events, or 
            other promotional communications relevant to their engagement with NeoZaar.
          </p>

          <h5 className="text-base font-semibold mt-6 mb-3 text-black">
            e. Research, Analytics, and Product Development
          </h5>
          <p className="mb-6  text-black">
            To conduct internal research, usage analysis, and trend evaluation to enhance the efficiency, usability, and scalability of 
            NeoZaar’s products, AI tools (Nova and Neo), and marketplace ecosystem.
          </p>

          <h5 className="text-base font-semibold mt-6 mb-3 text-black">
          f. Legal and Regulatory Compliance
          </h5>
          <p className="mb-6  text-black">
           To comply with applicable laws, regulations, government requests, or legal obligations, including data retention, audit, and 
           reporting requirements.
          </p>

          <h5 className="text-base font-semibold mt-6 mb-3 text-black">
            g. Security, Risk Management, and Fraud Prevention
          </h5>
          <p className="mb-6  text-black">
            To detect, prevent, and mitigate security threats, unauthorized access, fraud, or other prohibited activities; and to safeguard
            the integrity of the Platform and associated infrastructure.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">4. How We Share Your Information</h2>
          <h5 className="text-base font-semibold mt-6 mb-3 text-black">4.1 Authorized Sharing</h5>
          <p className="mb-6  text-black">
            NeoZaar may share, disclose, or otherwise make available certain categories of information to the following entities strictly
            on a need-to-know basis and for legitimate business purposes only:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
           <li>
              <strong>Verified Independent Software Vendors (ISVs) and Partners:</strong> For the purpose of facilitating marketplace listings, joint go-to-market activities, co-sell initiatives, and other collaborative engagements authorized by the User or Partner.
              </li>
            <li>
              <strong>Internal Teams and Affiliates:</strong> To enable operations, account management, technical maintenance, analytics, billing, and customer support activities within NeoZaar’s affiliated group entities or controlled subsidiaries, subject to appropriate confidentiality obligations.
              </li>
           <li>
              <strong>Third-Party Service Providers and Technology Partners:</strong> NeoZaar may engage third-party service providers, including but not limited to Zoho, Wix, OpenAI, and Google Analytics, for CRM, website hosting, AI assistance, analytics, communication, and operational support. Such third parties are contractually bound to maintain confidentiality and process data only under NeoZaar’s lawful instructions.
              </li>
            <li>
              <strong>Legal, Regulatory, or Governmental Authorities:</strong> To the extent required by applicable law, regulation, court order, or governmental directive, NeoZaar may disclose information to law enforcement agencies, regulators, or competent authorities.
              </li>
            </ul>
            <h5 className="text-base font-semibold mt-6 mb-3 text-black">4.2 Restrictions on Use and Disclosure</h5>
            <p className="mb-6  text-black">
              All recipients of shared data shall be bound by confidentiality and data protection obligations consistent with this Privacy 
              Policy and applicable law. NeoZaar shall not authorize the collection, use, or further disclosure of such information by third 
              parties for any purpose other than that expressly permitted by NeoZaar.
            </p>

             <h5 className="text-base font-semibold mt-6 mb-3 text-black">4.3 No Sale of Personal Data</h5>
             <p className="mb-6  text-black">
              NeoZaar does not sell, trade, lease, or rent personal or business information to any third party under any circumstances.
              Any data processing or transfer shall be limited to legitimate business purposes as outlined in this Privacy Policy.
          </p>

           <h5 className="text-base font-semibold mt-6 mb-3 text-black">4.4 Cross-Border Data Transfers</h5>
          <p className="mb-6  text-black">
            In cases where data is transferred outside India for processing or storage, NeoZaar shall ensure that such transfers comply with 
            applicable data protection laws and that the recipient jurisdiction provides an adequate level of data protection, or that appropriate
            safeguards (such as contractual clauses or equivalent mechanisms) are in place.
          </p>

           <h5 className="text-base font-semibold mt-6 mb-3 text-black">4.5 Data Processing Agreements (DPAs):</h5>
          <p className="mb-6  text-black">
            All third-party service providers engaged by NeoZaar are bound by written Data Processing Agreements that include confidentiality clauses, 
            data protection obligations, and security standards consistent with the requirements of the DPDP Act and GDPR.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">5. Cookies and Tracking Technologies</h2>
          <p className="mb-6  text-black">
            NeoZaar uses strictly necessary cookies to operate the Website (authentication, session, security and load-balancing) and,
            only with your consent, analytics cookies to understand how the Website is used so we can measure and improve it. We do not
            use cookies for cross-site advertising, remarketing or retargeting.
          </p>
          <p className="mb-6  text-black">
            Non-essential cookies are placed only after you opt in through our consent banner, which is shown to every visitor. You can
            review or change your choice at any time — withdrawing consent is as easy as giving it — using the &quot;Cookie Preferences&quot;
            link in the footer. When you withdraw a category we stop the relevant tags and delete the associated cookies we can reach. You
            may also manage or block cookies through your browser settings, though some features may then not work.
          </p>
          <p className="mb-6  text-black">
            Full details of each cookie category, its purpose, the recipients and retention periods are set out in our{" "}
            <a href="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</a>. For analytics cookies we rely on your
            consent under Section 6 of the Digital Personal Data Protection Act, 2023. Consent-related grievances may be raised with our
            Compliance Officer and, if unresolved, with the Data Protection Board of India.
          </p>
            

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">6. Your Rights and Choices</h2>
          <p className="mb-6  text-black">
            Under the Digital Personal Data Protection Act, 2023, if you are a Data Principal in India you have the right to:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2 text-black">
            <li><strong>Access:</strong> obtain a summary of the personal data we process about you and the processing activities undertaken.</li>
            <li><strong>Correction and erasure:</strong> have inaccurate or misleading data corrected or completed, and have your personal data erased where it is no longer needed for the purpose it was collected (unless retention is required by law).</li>
            <li><strong>Withdraw consent:</strong> withdraw any consent you have given, at any time and as easily as it was given. Withdrawal does not affect processing carried out before withdrawal.</li>
            <li><strong>Grievance redressal:</strong> raise a grievance with us about the handling of your personal data or the exercise of your rights. We will respond within the timeline prescribed under the DPDP Act and its Rules.</li>
            <li><strong>Nominate:</strong> nominate another individual to exercise these rights in the event of your death or incapacity.</li>
          </ul>
          <p className="mb-6 text-black">
            To exercise any of these rights or raise a grievance, contact our Compliance Officer at{" "}
            <a href="mailto:compliance@neozaar.com" className="text-blue-600 hover:underline">compliance@neozaar.com</a>. If your grievance
            is not resolved to your satisfaction, you may complain to the{" "}
            <strong>Data Protection Board of India</strong>. You can also unsubscribe from marketing emails at any time using the link in
            those emails, and manage cookie consent from &quot;Cookie Preferences&quot; in the footer.
          </p>
          <p className="mb-6 text-black">
            Depending on where you are located, you may have additional rights under other laws — for example data portability and the
            right to object under the EU/UK GDPR, or the rights to know, delete, correct and opt out of &quot;sale&quot;/&quot;sharing&quot;
            under the California Consumer Privacy Act (CCPA/CPRA). EU and UK residents may also lodge a complaint with their national
            supervisory authority. We honour verified requests under these laws to the extent they apply to you.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">7. Data Security</h2>
          <p className="mb-6  text-black">
            NeoZaar employs appropriate technical, organizational, and administrative safeguards to protect your
            personal and business information from unauthorized access, alteration, disclosure, or destruction. 
            These safeguards include, but are not limited to, the use of HTTPS encryption, role-based access control, 
            secure authentication protocols, and cloud infrastructure hosted on trusted providers such as AWS and 
            Microsoft Azure.
          </p>

          <p className="mb-6  text-black">
            We regularly review and update our security practices to align with industry standards. However, while we 
            strive to ensure the protection of your information, no system or electronic storage method can guarantee 
            absolute security, and you acknowledge that you share information with us at your own risk.
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
            <li>Encrypted communication (HTTPS)</li>
            <li>Access control based on user roles</li>
            <li>Secure cloud infrastructure (e.g., AWS, Azure)</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">8. Data Retention</h2>
          <p className="mb-6  text-black">
            We retain personal and business information only for as long as it is necessary to fulfill the purposes for 
            which it was collected, to comply with applicable legal, regulatory, tax, or accounting requirements, to
            resolve disputes, and to enforce our contractual rights.
          </p>
          <p className="mb-6 text-black">
            When your account becomes inactive or upon your request for deletion, NeoZaar will either delete or anonymize
            your personal data, unless retention is required by law or for legitimate business purposes such as fraud 
            prevention or compliance obligations.
          </p>
          
        

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">9. Third-Party Links and Integrations</h2>
          <p className="mb-6 text-black">
            Our Website and platform may contain links to third-party websites, tools, or integrations, including but not 
            limited to cloud partners, marketplace listings, analytics providers, and payment gateways. These third-party
            services operate independently of NeoZaar and are governed by their own privacy policies and terms of service.
          </p>
          <p className="mb-6 text-black">
            NeoZaar does not control and is not responsible for the privacy practices, content, or data handling procedures 
            of such third-party sites or services. We encourage you to review the privacy policies of any third-party platforms
            you interact with through NeoZaar before providing any personal or business information.
          </p>
          <p className="mb-6 text-black">
            The integrations we provide — including but not limited to Zoho, Wix, Google Analytics, OpenAI, and other verified 
            partners — are used solely to enhance service performance, analytics, and functionality. Data shared with such third 
            parties is limited to what is necessary for them to perform their designated functions on our behalf, and all such 
            transfers comply with applicable data protection laws.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">10. International Data Transfers</h2>
          <p className="mb-6 text-black">
           NeoZaar operates in multiple jurisdictions and may process or transfer your personal data across national borders, 
           including to countries that may not have the same level of data protection as your home country.
          </p>
          <p className="mb-6 text-black">
           When we transfer personal information outside India or the region in which it was originally collected, we ensure
           that such transfers comply with applicable data protection and privacy laws, including the Digital Personal Data 
           Protection Act, 2023 (DPDP Act) and other relevant international standards such as the General Data Protection 
           Regulation (GDPR) where applicable.
          </p>
          <p className="mb-6 text-black">
            All cross-border transfers are carried out under appropriate safeguards, including but not limited to:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2 text-black">
            <li>Standard Contractual Clauses (SCCs) or equivalent contractual mechanisms,</li>
            <li>Data Processing Agreements (DPAs) with third-party service providers,</li>
            <li>Verification of adequate data protection frameworks in the recipient country.</li>
          </ul>
          <p className="mb-6 text-black">
             By using our services or providing your information, you consent to the transfer, storage, and processing of your 
             information in accordance with this Privacy Policy and applicable law.
          </p>
          <p className="mb-6 text-black">
             NeoZaar ensures that all international data transfers comply with applicable legal frameworks such as the EU 
             Standard Contractual Clauses (SCCs), UK International Data Transfer Addendum (IDTA), or equivalent transfer 
             mechanisms under the DPDP Act and other recognized privacy frameworks.
          </p>
          <p className="mb-6 text-black">
             Where data is transferred to jurisdictions that may not offer equivalent data protection standards, NeoZaar 
             shall implement appropriate safeguards to protect such data.
          </p>
          

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">11. Legal Basis for Processing</h2>
          <p className="mb-6  text-black">
            For Data Principals in India, the Digital Personal Data Protection Act, 2023 permits processing of personal data only on the
            basis of <strong>consent</strong> or one of the <strong>legitimate uses specified in Section 7 of the Act</strong>. NeoZaar
            relies on:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2  text-black">
            <li>
              <strong>Consent (Section 6):</strong> for analytics cookies, marketing communications, and any other processing for which
              we ask you to opt in. Your consent is sought through a clear affirmative action, is limited to the stated purpose, and can
              be withdrawn at any time.
            </li>
            <li>
              <strong>Certain legitimate uses (Section 7):</strong> where you have voluntarily provided your personal data for a specified
              purpose and have not indicated that you object to its use for that purpose (for example, creating an account, submitting an
              enquiry, or participating in a partner programme); to comply with a legal obligation, court order or lawful request of a
              public authority; and for other purposes expressly permitted under Section 7.
            </li>
          </ul>
          <p className="mb-6  text-black">
            Where processing is based on consent, we will not make the provision of a service conditional on consent to processing that is
            not necessary for that service, and you may withdraw consent as easily as you gave it. When consent is withdrawn or the
            purpose is served, we cease the processing and erase the data unless retention is required by law.
          </p>
          <p className="mb-6  text-black">
            For individuals located outside India, processing may additionally rely on the legal bases available under the applicable law
            of that jurisdiction — for example performance of a contract, compliance with a legal obligation, protection of vital
            interests, or legitimate interests under the EU/UK GDPR, subject to the safeguards those laws require.
          </p>
          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">12. Children’s Privacy</h2>
          <p className="mb-6  text-black">
            NeoZaar is a business-to-business (B2B) platform designed exclusively for professionals, organizations, and business entities. Our services are not intended for individuals under the age of 18.
          </p>
          <p className="mb-6  text-black">
            We do not knowingly collect, store, or process personal data from minors. In the event that we become aware that personal information has been inadvertently collected from a person under 18 years of age, such information shall be promptly deleted from our records.
          </p>
          <p className="mb-6  text-black">
            NeoZaar does not knowingly collect or process data from individuals under the age of 16 within the European Union, the United Kingdom, or jurisdictions where higher age thresholds apply.
          </p>
          <p className="mb-6  text-black">
           Parents or legal guardians who believe that their child has provided personal information to NeoZaar without consent are encouraged to contact us immediately at {" "}
           <a
              href="mailto:admin@neozaar.com"
              className="text-blue-600 hover:underline"
            >
              admin@neozaar.com
            </a>{" "}
            so that appropriate action can be taken in accordance with applicable data protection laws.
          </p>
          
           <h2 className="text-xl font-semibold mt-6 mb-3 text-black">13. Updates to This Policy</h2>
          <p className="mb-6 text-black">
           NeoZaar reserves the right to amend, modify, or update this Privacy Policy from time to time to reflect changes in legal requirements, technological advancements, or our business practices.
          </p>
          <p className="mb-6 text-black">
            Any revisions to this Policy shall be effective upon posting the updated version on our official website at {" "}
            <a
              href="mailto:admin@neozaar.com"
              className="text-blue-600 hover:underline"
            >
              www.neozaar.com
            </a>{" "}
            , with the revised Effective Date clearly indicated at the top of the document.
          </p>
          <p className="mb-6  text-black">
            We encourage users to review this Policy periodically to remain informed about how we protect and process personal information. Continued use of our platform following any updates constitutes acceptance of the revised Privacy Policy.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">14. Governing Law and Dispute Resolution</h2>
          <p className=" text-black">
            This Privacy Policy shall be governed by and construed in accordance with the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts of Mumbai, Maharashtra, India.
          </p>
          <p className=" text-black">
            For users located outside India, this does not affect your statutory rights under the data protection laws of your country of residence.    
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3 text-black">12. Contact Us</h2>
          <p className=" text-black">
            If you have any questions, concerns, or requests related to this Privacy Policy or the handling of your personal information, you may contact us through the following details:
          </p>
           <p className=" text-black font-semibold">
             Compliance Officer (CO)
           </p>
            <p className=" text-black">
              NeoZaar Technologies Pvt. Ltd.
            </p>
            <p className=" text-gray-700">
             Email:{" "}
            <a
              href=""
              className="text-blue-600 hover:underline"
            >
              compliance@neozaar.com
            </a>{" "}
            </p>
          <p className=" text-black">
             Website:{" "}
            <a
              href="mailto:admin@neozaar.com"
              className="text-blue-600 hover:underline"
            >
              www.neozaar.com
            </a>{" "}
            <br/>
            Address: 1602, 16th Floor, G Square Business Park, Sector 30A, Vashi, Navi Mumbai – 400703
            </p>
            <p className="text-black">
              The CO is responsible for overseeing NeoZaar’s compliance with applicable data protection laws 
              and responding to data subject requests. We will review and respond to your inquiry in accordance
              with applicable data protection laws.
            </p>

        </section>
      </main>
      <Footer />
    </>
  );
}


