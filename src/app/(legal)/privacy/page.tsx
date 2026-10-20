import type { Metadata } from "next";
import { CONTACT_EMAIL, LEGAL_UPDATED, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy. EvenCost" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Last updated: {LEGAL_UPDATED}</p>

      <h2>Who is responsible</h2>
      <p>
        EvenCost is a hobby project run by <strong>{OPERATOR_NAME}</strong> (&quot;I&quot;), who is
        the controller of your personal data. Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> for anything about your data.
      </p>

      <h2>What I collect, and why</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email, your nickname, and a password stored only as an
          Argon2id hash. Used to create your account and let you log in.
        </li>
        <li>
          <strong>Sign-in records:</strong> a session token, its expiry, and the IP address and
          browser details seen when you signed in. Used to keep you logged in and to protect the
          service against abuse.
        </li>
        <li>
          <strong>Group content:</strong> the groups you create or join, and the expenses,
          shares, settlements and notes you or other members add. Used to calculate who owes whom.
        </li>
      </ul>
      <p>
        Other members of your groups see your nickname and what you add. They never see your
        email.
      </p>
      <p>
        I do not use analytics, advertising or tracking, and I do not sell or share your data for
        marketing.
      </p>

      <h2>Legal basis</h2>
      <ul>
        <li>
          Account and group content: it is needed to provide the service you asked for (GDPR Art.
          6(1)(b)).
        </li>
        <li>
          Sign-in records and rate limiting: my legitimate interest in keeping the service secure
          (Art. 6(1)(f)).
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        EvenCost sets one cookie: the session cookie that keeps you logged in. It is strictly
        necessary for the service, so it needs no consent banner. There are no other cookies and
        no third-party trackers.
      </p>

      <h2>Who processes data for me</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> hosts the application. It is based in the United States;
          transfers rely on the safeguards in Vercel&apos;s data processing terms.
        </li>
        <li>
          <strong>Neon</strong> hosts the database, in the AWS Frankfurt region (EU).
        </li>
      </ul>

      <h2>How long I keep it</h2>
      <ul>
        <li>Account data: until you delete your account.</li>
        <li>Sign-in records: until the session expires or you log out, or until you delete your account.</li>
        <li>
          Group content: kept so that balances stay correct for the other members. After you
          delete your account it shows your name as &quot;Deleted user&quot;.
        </li>
        <li>
          Backups at my database provider may hold deleted data for a short time before they
          expire.
        </li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        You can delete your account yourself: open your profile and choose Delete account. I then
        remove your email, password and sign-ins, and replace your name with &quot;Deleted
        user&quot;. If you own a group that other people are still in, delete that group first.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, to correct it, to erase it, to restrict or object to
        its use, and to receive it in a portable format. Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. You can also complain to the
        Polish data protection authority, the President of the Personal Data Protection Office
        (UODO), at <a href="https://uodo.gov.pl">uodo.gov.pl</a>, or to the authority in your own
        country.
      </p>

      <h2>Children</h2>
      <p>EvenCost is not meant for anyone under 16.</p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top changes with it.
      </p>
    </>
  );
}
