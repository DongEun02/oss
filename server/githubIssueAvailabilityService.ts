const RELATED_PRS_PER_ISSUE = 100;

const RELATED_PULL_REQUESTS_QUERY = `
  query RelatedPullRequests($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Issue {
        id
        timelineItems(first: ${RELATED_PRS_PER_ISSUE}, itemTypes: [CROSS_REFERENCED_EVENT]) {
          nodes {
            ... on CrossReferencedEvent {
              source {
                __typename
                ... on PullRequest {
                  id
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    }
  }
`;

const githubHeaders = (githubToken: any) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${githubToken}`,
  "Content-Type": "application/json",
  "User-Agent": "giyeoro-issue-availability",
  "X-GitHub-Api-Version": "2022-11-28"
});

const relatedPullRequestResult = (node: any) => {
  const pullRequestIds = (node?.timelineItems?.nodes || [])
    .map((event: any) => event?.source)
    .filter((source: any) => source?.__typename === "PullRequest" && source.id)
    .map((pullRequest: any) => pullRequest.id);

  return {
    count: new Set(pullRequestIds).size,
    truncated: !!node?.timelineItems?.pageInfo?.hasNextPage
  };
};

export const enrichRelatedPullRequestCounts = async (
  issues: any,
  githubToken: any,
  { required = false } = {}
) => {
  if (issues.length === 0) return issues;
  if (!githubToken) {
    if (required) throw new Error("GITHUB_TOKEN_REQUIRED");
    return issues;
  }

  const nodeIds = [...new Set<string>(
    issues
      .map((issue: any) => issue.githubNodeId)
      .filter((nodeId: any): nodeId is string => typeof nodeId === "string" && nodeId.length > 0)
  )];
  if (nodeIds.length === 0) {
    if (required) throw new Error("GITHUB_RELATED_PRS_UNAVAILABLE");
    return issues;
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: githubHeaders(githubToken),
      body: JSON.stringify({
        query: RELATED_PULL_REQUESTS_QUERY,
        variables: { ids: nodeIds }
      }),
      signal: AbortSignal.timeout(20_000)
    });
    if (response.status === 403 || response.status === 429) throw new Error("GITHUB_RATE_LIMIT");
    if (!response.ok) throw new Error("GITHUB_RELATED_PRS_UNAVAILABLE");

    const payload: any = await response.json();
    if (payload.errors?.length) throw new Error("GITHUB_RELATED_PRS_UNAVAILABLE");
    const countsByNodeId = new Map<string, { count: number; truncated: boolean }>(
      (payload.data?.nodes || [])
        .filter((node: any) => node?.id)
        .map((node: any) => [node.id, relatedPullRequestResult(node)] as const)
    );

    if (required && nodeIds.some(nodeId => !countsByNodeId.has(nodeId))) {
      throw new Error("GITHUB_RELATED_PRS_UNAVAILABLE");
    }

    return issues.map((issue: any) => {
      const relatedPullRequests = countsByNodeId.get(issue.githubNodeId);
      if (!relatedPullRequests) return issue;
      return {
        ...issue,
        relatedPullRequestCount: relatedPullRequests.count,
        relatedPullRequestCountTruncated: relatedPullRequests.truncated
      };
    });
  } catch (error) {
    if (required) throw error;
    return issues;
  }
};

export const isUnclaimedIssue = (issue: any) => (
  (issue.assignees?.length || 0) === 0
  && issue.relatedPullRequestCount === 0
  && !issue.relatedPullRequestCountTruncated
);
