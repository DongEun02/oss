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

const githubHeaders = githubToken => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${githubToken}`,
  "Content-Type": "application/json",
  "User-Agent": "oss-issue-availability",
  "X-GitHub-Api-Version": "2022-11-28"
});

const relatedPullRequestResult = node => {
  const pullRequestIds = (node?.timelineItems?.nodes || [])
    .map(event => event?.source)
    .filter(source => source?.__typename === "PullRequest" && source.id)
    .map(pullRequest => pullRequest.id);

  return {
    count: new Set(pullRequestIds).size,
    truncated: !!node?.timelineItems?.pageInfo?.hasNextPage
  };
};

export const enrichRelatedPullRequestCounts = async (
  issues,
  githubToken,
  { required = false } = {}
) => {
  if (issues.length === 0) return issues;
  if (!githubToken) {
    if (required) throw new Error("GITHUB_TOKEN_REQUIRED");
    return issues;
  }

  const nodeIds = [...new Set(issues.map(issue => issue.githubNodeId).filter(Boolean))];
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

    const payload = await response.json();
    if (payload.errors?.length) throw new Error("GITHUB_RELATED_PRS_UNAVAILABLE");
    const countsByNodeId = new Map(
      (payload.data?.nodes || [])
        .filter(node => node?.id)
        .map(node => [node.id, relatedPullRequestResult(node)])
    );

    if (required && nodeIds.some(nodeId => !countsByNodeId.has(nodeId))) {
      throw new Error("GITHUB_RELATED_PRS_UNAVAILABLE");
    }

    return issues.map(issue => {
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

export const isUnclaimedIssue = issue => (
  (issue.assignees?.length || 0) === 0
  && issue.relatedPullRequestCount === 0
  && !issue.relatedPullRequestCountTruncated
);
