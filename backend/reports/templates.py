from backend.utils.constants import Role

class BaseTemplate:
    """Base template defining common branding across reports."""
    CORPORATE_COLOR = "#1a1a1a"
    HIGHLIGHT_COLOR = "#00ff9d"
    FONT_MAIN = "Helvetica"
    
class SmartSummaryTemplate(BaseTemplate):
    """
    Template for Viewer roles.
    Uses plain-English headers, excludes internal IPs/MACs, and simplifies technical jargon.
    """
    TITLE = "NETRIQ Executive Security Summary"
    INCLUDE_RAW_LOGS = False
    
    @staticmethod
    def format_verdict(verdict: bool) -> str:
        return "Blocked" if verdict else "Allowed"

class TechnicalTemplate(BaseTemplate):
    """
    Template for Analyst/Admin roles.
    Includes raw packet data, exact AI confidences, IPs, and MACs.
    """
    TITLE = "NETRIQ Technical Threat Analysis"
    INCLUDE_RAW_LOGS = True
    
    @staticmethod
    def format_verdict(verdict: bool) -> str:
        return str(verdict).upper()

def get_template(role: Role) -> type[BaseTemplate]:
    if role == Role.VIEWER:
        return SmartSummaryTemplate
    return TechnicalTemplate
