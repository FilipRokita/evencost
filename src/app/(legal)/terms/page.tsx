import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_UPDATED, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service. EvenCost" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>Last updated: {LEGAL_UPDATED}</p>

      <h2>1. Who provides the service</h2>
      <p>
        EvenCost is a hobby project run by <strong>{OPERATOR_NAME}</strong>, contact:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. By creating an account you accept
        these Terms.
      </p>

      <h2>2. What the service is</h2>
      <p>
        EvenCost lets a group record shared expenses, split them, and see who owes whom. It is
        free. It only keeps records: it does not hold or move money, and it is not financial,
        tax or legal advice. Settlements are notes that you made a payment elsewhere.
      </p>

      <h2>3. Using it</h2>
      <ul>
        <li>You need to be at least 16 and give a working email address.</li>
        <li>You need a current browser with JavaScript and cookies enabled.</li>
        <li>You are responsible for your password and for what happens under your account.</li>
        <li>
          Do not put unlawful content in groups, expense titles or notes, and do not attack,
          overload or misuse the service.
        </li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        What you add stays yours. You allow me to store it and show it to the members of your
        groups, which is the point of the service. How I handle personal data is described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>5. Starting and ending</h2>
      <p>
        The agreement starts when you create an account. You can end it at any time by deleting
        your account in your profile. I may suspend or remove an account that breaks these Terms
        or harms the service or other people. I may also end the service; this is a hobby project
        and it may change or be taken down at any time.
      </p>

      <h2>6. No guarantees</h2>
      <p>
        The service is provided as it is. I take care that the arithmetic is correct, but I do
        not promise that it is always available or free of errors, so check important amounts
        yourself. To the extent the law allows, I am not liable for losses that come from using
        the service. Nothing here limits rights you have by law that cannot be waived, including
        consumer rights.
      </p>

      <h2>7. Complaints and reports</h2>
      <p>
        Send complaints about the service, and reports of unlawful content, to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. I aim to answer within 14 days.
      </p>

      <h2>8. Changes</h2>
      <p>
        I may change these Terms. The date at the top shows the current version, and using the
        service after a change means you accept the new version.
      </p>

      <h2>9. Law</h2>
      <p>
        Polish law applies. If you are a consumer, you also keep the mandatory protections of the
        country where you live.
      </p>
    </>
  );
}
