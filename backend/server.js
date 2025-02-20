import express from "express";
import cors from "cors";

const app = express();
const PORT = 5060;

app.use(cors());

// 🔥 Fake Web ACLs using your provided SampleRuleSet
const fakeAcls = [
  {
    Id: "fake-acl-1",
    Name: "MockWebACL-1",
    Description: "This is a fake Web ACL with SampleRuleSet",
    Rules: [
      {
        Name: "rule1",
        Priority: 0,
        Statement: {
          ByteMatchStatement: {
            SearchString: "/path1/",
            FieldToMatch: {
              UriPath: {}
            },
            TextTransformations: [
              {
                Priority: 0,
                Type: "NONE"
              }
            ],
            PositionalConstraint: "STARTS_WITH"
          }
        },
        Action: {
          Count: {}
        },
        RuleLabels: [
          {
            Name: "label_rule1"
          }
        ],
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: "metric_rule1"
        }
      },
      {
        Name: "rule2",
        Priority: 1,
        Statement: {
          ByteMatchStatement: {
            SearchString: "/path2/",
            FieldToMatch: {
              UriPath: {}
            },
            TextTransformations: [
              {
                Priority: 0,
                Type: "NONE"
              }
            ],
            PositionalConstraint: "STARTS_WITH"
          }
        },
        Action: {
          Count: {}
        },
        RuleLabels: [
          {
            Name: "label_rule2"
          }
        ],
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: "metric_rule2"
        }
      },
      {
        Name: "rule3",
        Priority: 2,
        Statement: {
          RateBasedStatement: {
            Limit: 100,
            EvaluationWindowSec: 60,
            AggregateKeyType: "IP",
            ScopeDownStatement: {
              NotStatement: {
                Statement: {
                  LabelMatchStatement: {
                    Scope: "LABEL",
                    Key: "label_rule1"
                  }
                }
              }
            }
          }
        },
        Action: {
          Count: {
            CustomRequestHandling: {
              InsertHeaders: [
                {
                  Name: "custom-header",
                  Value: "true"
                }
              ]
            }
          }
        },
        RuleLabels: [
          {
            Name: "label_rule3"
          }
        ],
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: "metric_rule3"
        }
      },
      {
        Name: "rule4",
        Priority: 3,
        Statement: {
          ByteMatchStatement: {
            SearchString: "/path4/",
            FieldToMatch: {
              UriPath: {}
            },
            TextTransformations: [
              {
                Priority: 0,
                Type: "NONE"
              }
            ],
            PositionalConstraint: "STARTS_WITH"
          }
        },
        Action: {
          Count: {}
        },
        RuleLabels: [
          {
            Name: "label_rule4"
          }
        ],
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: "metric_rule4"
        }
      }
    ]
  }
];

// Function to return fake ACLs
async function listWafAcls() {
  console.log("✅ Returning Fake WAF ACLs");
  return fakeAcls;
}

// Function to return fake ACL details
async function getAclDetails(aclId, aclName) {
  console.log(`✅ Returning Fake ACL Details for: ${aclName} (ID: ${aclId})`);
  return fakeAcls.find((acl) => acl.Id === aclId) || null;
}

// API Endpoint: Get Fake WAF ACLs with rules
app.get("/api/waf-acls", async (req, res) => {
  try {
    console.log("🚀 API Request: Fetching all Fake WAF ACLs...");
    const acls = await listWafAcls();

    if (acls.length === 0) {
      console.warn("⚠️ No Fake WAF ACLs found.");
      return res.json([]);
    }

    console.log(`📌 Found ${acls.length} ACLs. Fetching details...`);

    const detailedAcls = await Promise.all(
      acls.map(async (acl) => {
        console.log(`🔍 Processing Fake ACL: ${acl.Name} (ID: ${acl.Id})`);
        const details = await getAclDetails(acl.Id, acl.Name);
        return details || acl;
      })
    );

    console.log("✅ Final Fake Processed ACL Data:", JSON.stringify(detailedAcls, null, 2));
    res.json(detailedAcls);
  } catch (error) {
    console.error("❌ Error fetching Fake WAF data:", error);
    res.status(500).json({ error: "Error fetching Fake WAF ACLs" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});