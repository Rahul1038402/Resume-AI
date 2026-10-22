/**
 * Deciding what a Gmail sync should do to the board.
 *
 * Pulled out of the component because it is the part that can quietly corrupt
 * someone's tracker: the old version was a plain insert, so a sync could only
 * ever add cards. An interview invitation for a company already on the board
 * produced a second card beside the first instead of moving it along - which
 * is the one thing a board of statuses exists to do - and a re-scanned email
 * produced a third.
 *
 * Pure, so it can be tested without a database or a browser.
 */

export type Status = 'applied' | 'in_progress' | 'got_offer' | 'not_selected';

export interface ExistingApplication {
    id: string;
    company: string | null;
    job_role: string | null;
    status: string;
    email_message_id?: string | null;
}

export interface ExtractedApplication {
    company_name: string;
    job_title: string;
    application_date: string;
    status: string;
    platform: string;
    notes: string;
    email_message_id: string;
    email_subject: string;
    email_sender: string;
    confidence: string;
}

/** What a single extracted email will do to the board, for the review list. */
export type Decision =
    | { action: 'insert' }
    | { action: 'advance'; from: string; to: string }
    | { action: 'skip'; reason: 'duplicate' | 'no-change' };

export interface ImportPlan {
    insert: ExtractedApplication[];
    advance: { id: string; status: string; from: string }[];
    unchanged: number;
    /** Keyed by email_message_id, so the modal can label each card. */
    decisions: Record<string, Decision>;
}

/**
 * How far along an application is, as a number.
 *
 * Mail arrives out of order - a confirmation can land after the interview
 * invite it confirms - so a status is only ever allowed to move forward.
 * Without this, one late "we received your application" would drag a card that
 * already had an offer back to the first column.
 *
 * A rejection arriving after an offer is the one case this gets wrong, and it
 * is rare enough to be worth the protection against the common case.
 */
export const STATUS_RANK: Record<string, number> = {
    applied: 0,
    in_progress: 1,
    not_selected: 2,
    got_offer: 3,
};

/** Marks a row this plan is about to create, which has no database id yet. */
const PENDING_ID = '';

const normalise = (value: string | null | undefined) =>
    (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function planImport(
    extracted: ExtractedApplication[],
    existing: ExistingApplication[],
): ImportPlan {
    // A working copy, so two emails in one batch about the same application
    // see each other's effect instead of both inserting.
    const rows = existing.map(r => ({ ...r }));
    const seenMessageIds = new Set(
        rows.map(r => r.email_message_id).filter(Boolean) as string[],
    );

    const plan: ImportPlan = { insert: [], advance: [], unchanged: 0, decisions: {} };

    for (const app of extracted) {
        // The same email must never produce a second card, however many times
        // it is scanned.
        if (app.email_message_id && seenMessageIds.has(app.email_message_id)) {
            plan.unchanged += 1;
            plan.decisions[app.email_message_id] = { action: 'skip', reason: 'duplicate' };
            continue;
        }
        if (app.email_message_id) seenMessageIds.add(app.email_message_id);

        const company = normalise(app.company_name);
        const role = normalise(app.job_title);

        // Same company and role is a match. Falling back to company alone is
        // only safe when there is exactly one card for it; with two there is
        // no way to tell which role the email is about, so a new card is the
        // honest outcome.
        const sameCompany = rows.filter(r => normalise(r.company) === company);
        const match =
            sameCompany.find(r => normalise(r.job_role) === role) ||
            (sameCompany.length === 1 ? sameCompany[0] : undefined);

        if (match) {
            const from = STATUS_RANK[match.status] ?? 0;
            const to = STATUS_RANK[app.status] ?? 0;
            if (to > from) {
                /*
                 * The match may be a row this same batch is about to create -
                 * a confirmation and an interview invite often arrive in one
                 * sync. There is no id to update yet, so the pending insert is
                 * amended in place. Queueing an update against the placeholder
                 * id instead would match no row, fail silently, and leave the
                 * card in the first column.
                 */
                const pending = plan.insert.find(
                    (i) => i.email_message_id === match.email_message_id,
                );
                if (pending) {
                    pending.status = app.status;
                } else {
                    plan.advance.push({ id: match.id, status: app.status, from: match.status });
                }
                plan.decisions[app.email_message_id] = {
                    action: 'advance', from: match.status, to: app.status,
                };
                match.status = app.status;
            } else {
                plan.unchanged += 1;
                plan.decisions[app.email_message_id] = { action: 'skip', reason: 'no-change' };
            }
            continue;
        }

        plan.decisions[app.email_message_id] = { action: 'insert' };
        plan.insert.push({ ...app });
        rows.push({
            id: PENDING_ID,
            company: app.company_name,
            job_role: app.job_title,
            status: app.status,
            email_message_id: app.email_message_id,
        });
    }

    return plan;
}

export function describePlan(plan: ImportPlan): string {
    const parts: string[] = [];
    if (plan.insert.length) parts.push(`${plan.insert.length} added`);
    if (plan.advance.length) parts.push(`${plan.advance.length} moved forward`);
    if (plan.unchanged) parts.push(`${plan.unchanged} already up to date`);
    return parts.length ? parts.join(' · ') : 'Nothing to import';
}
