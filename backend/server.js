import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  WAFV2Client,
  ListWebACLsCommand,
  GetWebACLCommand,
  GetRuleGroupCommand
} from "@aws-sdk/client-wafv2";

dotenv.config();
const app = express();
app.use(cors());


app.get("/api/waf-acls-names/region/:region", async (req, res) => {
  try {
    const regionParam = req.params.region;
    console.log(`🚀 Fetching WAF ACLs for region: ${regionParam}`);

    const scope = regionParam.toUpperCase() === "CLOUDFRONT" || regionParam.toUpperCase() === "GLOBAL"
      ? "CLOUDFRONT"
      : "REGIONAL";

    const clientConfig = scope === "CLOUDFRONT"
      ? { region: process.env.AWS_REGION || "us-east-1" }
      : { region: regionParam };

    const wafClientForRegion = new WAFV2Client(clientConfig);

    const command = new ListWebACLsCommand({ Scope: scope });
    const response = await wafClientForRegion.send(command);
    const acls = response.WebACLs || [];

    const aclNames = acls.map(acl => acl.Name);

    res.json(aclNames);
  } catch (error) {
    console.error("❌ Error fetching WAF ACLs for region:", error);
    res.status(500).json({ error: "Error fetching WAF ACLs" });
  }
});


app.get("/api/waf-acl-details/region/:region/name/:name", async (req, res) => {
  try {
    const { region, name } = req.params;
    console.log(`🚀 Fetching ACL details for region: ${region}, name: ${name}`);

    const scope =
      region.toUpperCase() === "CLOUDFRONT" || region.toUpperCase() === "GLOBAL"
        ? "CLOUDFRONT"
        : "REGIONAL";

    const clientConfig =
      scope === "CLOUDFRONT"
        ? { region: process.env.AWS_REGION || "us-east-1" } 
        : { region };
    const wafClientForRegion = new WAFV2Client(clientConfig);

    const listCommand = new ListWebACLsCommand({ Scope: scope });
    const listResponse = await wafClientForRegion.send(listCommand);
    const acls = listResponse.WebACLs || [];

    const acl = acls.find(item => item.Name === name);
    if (!acl) {
      return res.status(404).json({ error: `ACL with name ${name} not found in region ${region}` });
    }

    const getCommand = new GetWebACLCommand({
      Id: acl.Id,
      Name: acl.Name,
      Scope: scope
    });
    const aclDetailsResponse = await wafClientForRegion.send(getCommand);
    let details = aclDetailsResponse.WebACL;
    if (!details) {
      return res.status(404).json({ error: `ACL details for ${name} not found` });
    }

    if (details.Rules) {
      details.Rules = await Promise.all(details.Rules.map(async rule => {
        if (rule.Statement?.RuleGroupReferenceStatement) {
          const rgArn = rule.Statement.RuleGroupReferenceStatement.ARN;
          try {
            const rgCommand = new GetRuleGroupCommand({
              ARN: rgArn,
              Scope: scope
            });
            const rgResponse = await wafClientForRegion.send(rgCommand);
            rule.RuleGroup = rgResponse.RuleGroup;
          } catch (error) {
            console.error(`❌ Error fetching rule group for ARN ${rgArn}:`, error);
          }
        }
        return rule;
      }));
    }

    res.json(details);
  } catch (error) {
    console.error("❌ Error in /api/waf-acl-details:", error);
    res.status(500).json({ error: "Error fetching ACL details" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});