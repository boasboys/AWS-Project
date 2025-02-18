import json
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from networkx.drawing.nx_agraph import graphviz_layout

# Complex WebACL JSON
web_acl_json = """
{
  "Name": "EnterpriseWebACL",
  "Rules": [
    {
      "Name": "SecurityRulesGroup",
      "Priority": 1,
      "RuleGroupReferenceStatement": {
        "ARN": "arn:aws:waf:us-east-1:123456789012:rulegroup/security-group"
      }
    },
    {
      "Name": "TrafficControlGroup",
      "Priority": 2,
      "RuleGroupReferenceStatement": {
        "ARN": "arn:aws:waf:us-east-1:123456789012:rulegroup/traffic-control"
      }
    }
  ],
  "RuleGroups": [
    {
      "Name": "SecurityRulesGroup",
      "Rules": [
        {
          "Name": "BlockBadIPs",
          "Statement": {
            "IPSetReferenceStatement": {
              "ARN": "arn:aws:waf:us-east-1:123456789012:ipset/bad-ips"
            }
          },
          "Action": {
            "Block": {}
          }
        },
        {
          "Name": "SQLInjectionProtection",
          "Statement": {
            "RegexPatternSetReferenceStatement": {
              "ARN": "arn:aws:waf:us-east-1:123456789012:regexpatternset/sql-injection"
            }
          },
          "Action": {
            "Block": {}
          }
        }
      ]
    },
    {
      "Name": "TrafficControlGroup",
      "Rules": [
        {
          "Name": "RateLimitTraffic",
          "Statement": {
            "RateBasedStatement": {
              "Limit": 5000,
              "AggregateKeyType": "IP"
            }
          },
          "Action": {
            "Count": {}
          }
        },
        {
          "Name": "AllowTrustedSources",
          "Statement": {
            "IPSetReferenceStatement": {
              "ARN": "arn:aws:waf:us-east-1:123456789012:ipset/trusted-ips"
            }
          },
          "Action": {
            "Allow": {}
          }
        }
      ]
    }
  ]
}
"""

# Parse JSON
web_acl_data = json.loads(web_acl_json)

# Create a directed graph
G = nx.DiGraph()
nodes_edges = []  # Stores nodes and edges in order

# Entry point: Traffic entering WAF
traffic_source = "Incoming Traffic"
G.add_node(traffic_source, color="cyan", shape="hexagon")
nodes_edges.append((traffic_source, None))  # Root node

# WebACL as the main control layer
web_acl_name = web_acl_data.get("Name", "WebACL")
nodes_edges.append((web_acl_name, traffic_source))

# Extract rule groups linked to WebACL
rules = web_acl_data.get("Rules", [])

for rule in rules:
    rule_group_name = rule.get("Name", "Unnamed Rule Group")
    nodes_edges.append((rule_group_name, web_acl_name))

# Extract rule groups and their rules
rule_groups = web_acl_data.get("RuleGroups", [])

for rule_group in rule_groups:
    rule_group_name = rule_group.get("Name", "Unnamed Rule Group")

    for rule in rule_group.get("Rules", []):
        rule_name = rule.get("Name", "Unnamed Rule")
        nodes_edges.append((rule_name, rule_group_name))  # Rule Group → Rule

        # Extract condition type
        if "Statement" in rule:
            statement = rule["Statement"]
            for key in statement:
                condition_name = f"Check {key}"
                nodes_edges.append((condition_name, rule_name))  # Rule → Condition

        # Extract action
        if "Action" in rule:
            action_name = list(rule["Action"].keys())[0]
            nodes_edges.append((action_name, rule_name))  # Rule → Action

# Final decision point: Traffic exits WAF
traffic_exit = "Final Decision"
G.add_node(traffic_exit, color="magenta", shape="hexagon")

# Ensure all actions connect to the final decision
for node, _ in nodes_edges:
    if node in ["Block", "Count", "Allow"]:
        nodes_edges.append((traffic_exit, node))

# Animation setup
fig, ax = plt.subplots(figsize=(14, 8))
node_colors = {
    "Incoming Traffic": "cyan",
    "WebACL": "red",
    "RuleGroup": "blue",
    "Rule": "green",
    "Condition": "orange",
    "Action": "purple",
    "Final Decision": "magenta"
}

def get_node_color(node):
    """Return the color of the node based on its type."""
    if node in node_colors:
        return node_colors[node]
    elif "Group" in node:
        return node_colors["RuleGroup"]
    elif "Check" in node:
        return node_colors["Condition"]
    elif node in ["Block", "Count", "Allow"]:
        return node_colors["Action"]
    else:
        return node_colors["Rule"]

# Function to update animation
def update(num):
    """Update the DAG visualization step by step."""
    ax.clear()
    current_nodes_edges = nodes_edges[:num]  # Show elements step by step
    G.clear()
    
    # Add nodes and edges incrementally
    for node, parent in current_nodes_edges:
        G.add_node(node, color=get_node_color(node))
        if parent:
            G.add_edge(parent, node)
    
    # Use Graphviz layout (left-to-right)
    pos = graphviz_layout(G, prog="dot", args="-Grankdir=LR")

    # Create an electric effect on edges
    edge_colors = ["red" if i < num else "gray" for i in range(len(G.edges()))]

    # Draw the graph
    node_colors_list = [nx.get_node_attributes(G, "color")[node] for node in G.nodes()]
    nx.draw(G, pos, with_labels=True, node_size=4000, node_color=node_colors_list, edge_color="gray", font_size=9, font_weight="bold", edgecolors="black", ax=ax)
    
    # Draw edges with progressive highlighting
    edges = list(G.edges())
    edge_colors = ["red" if i < num else "gray" for i in range(len(edges))]
    nx.draw_networkx_edges(G, pos, edgelist=edges[:num], edge_color=edge_colors, alpha=0.8, width=3, arrowstyle="->", arrowsize=20)

    plt.title("AWS WAF WebACL Traffic Flow Animation", fontsize=14)

# Animate the DAG
ani = animation.FuncAnimation(fig, update, frames=len(nodes_edges) + 1, interval=800, repeat=False)

plt.show()