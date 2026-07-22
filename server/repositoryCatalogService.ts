import { sql } from "drizzle-orm";
import { getDatabase } from "./database.js";
import type { ContributionLanguage } from "../shared/contributionCategories.js";

const LANGUAGE_ALIASES: Record<ContributionLanguage, readonly string[]> = {
  JavaScript: ["javascript"],
  TypeScript: ["typescript"],
  "HTML/CSS": ["html", "css", "scss"],
  Python: ["python"],
  Java: ["java"],
  Kotlin: ["kotlin"],
  Swift: ["swift"],
  Go: ["go"],
  Rust: ["rust"]
};

type CatalogRow = {
  full_name: string;
  deepwiki_url: string;
};

export type CatalogRepository = {
  fullName: string;
  deepWikiUrl: string;
};

export type CatalogRepositoryResult = {
  repositories: CatalogRepository[];
  totalCount: number;
  languageCandidateCount: number;
};

export const fetchCatalogRepositories = async ({
  databaseUrl,
  language,
  limit = 10
}: {
  databaseUrl?: string;
  language: ContributionLanguage;
  limit?: number;
}): Promise<CatalogRepositoryResult> => {
  const resolvedDatabaseUrl = (databaseUrl || process.env.DATABASE_URL || "").trim();
  if (!resolvedDatabaseUrl) return { repositories: [], totalCount: 0, languageCandidateCount: 0 };

  const aliases = LANGUAGE_ALIASES[language];
  const languageCondition = sql.join(
    aliases.map(alias => sql`LOWER(primary_language) = ${alias}`),
    sql` OR `
  );

  try {
    const database = getDatabase(resolvedDatabaseUrl);
    const eligibleCondition = sql`
      is_enabled = TRUE
      AND has_issues = TRUE
      AND is_archived = FALSE
      AND license_spdx IS NOT NULL
      AND license_spdx NOT IN ('NOASSERTION', 'OTHER')
    `;
    const [repositoriesResult, totalResult, languageCountResult] = await Promise.all([
      database.execute<CatalogRow>(sql`
        SELECT full_name, deepwiki_url
        FROM repository_catalog
        WHERE ${eligibleCondition}
          AND (${languageCondition})
        ORDER BY
          CASE WHEN pushed_at >= NOW() - INTERVAL '90 days' THEN 0 ELSE 1 END,
          source_rank ASC NULLS LAST,
          stars DESC
        LIMIT ${Math.max(1, Math.min(limit, 30))}
      `),
      database.execute<{ count: number }>(sql`
        SELECT COUNT(*)::int AS count
        FROM repository_catalog
        WHERE is_enabled = TRUE
      `),
      database.execute<{ count: number }>(sql`
        SELECT COUNT(*)::int AS count
        FROM repository_catalog
        WHERE ${eligibleCondition}
          AND (${languageCondition})
      `)
    ]);
    return {
      repositories: repositoriesResult.rows.map(row => ({
        fullName: row.full_name,
        deepWikiUrl: row.deepwiki_url
      })),
      totalCount: totalResult.rows[0]?.count || 0,
      languageCandidateCount: languageCountResult.rows[0]?.count || 0
    };
  } catch (error) {
    console.warn("Repository catalog lookup failed; using curated fallback.", error);
    return { repositories: [], totalCount: 0, languageCandidateCount: 0 };
  }
};
