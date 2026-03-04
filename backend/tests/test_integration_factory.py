import unittest

from app.schemas.integration_config import ToolType as IntegrationToolType
from app.schemas.workspace import ToolType as WorkspaceToolType
from app.services.integrations.ado import AdoAdapter
from app.services.integrations.factory import get_integration_adapter
from app.services.integrations.jira import JiraAdapter


class IntegrationFactoryTests(unittest.TestCase):
    def test_returns_jira_adapter_for_workspace_enum(self) -> None:
        adapter = get_integration_adapter(WorkspaceToolType.jira)
        self.assertIsInstance(adapter, JiraAdapter)

    def test_returns_ado_adapter_for_workspace_enum(self) -> None:
        adapter = get_integration_adapter(WorkspaceToolType.azure_devops)
        self.assertIsInstance(adapter, AdoAdapter)

    def test_returns_jira_adapter_for_integration_enum(self) -> None:
        adapter = get_integration_adapter(IntegrationToolType.jira)
        self.assertIsInstance(adapter, JiraAdapter)

    def test_supports_string_aliases_for_ado(self) -> None:
        for alias in ("ado", "azdo", "AzureDevOps", "AZURE_DEVOPS"):
            with self.subTest(alias=alias):
                adapter = get_integration_adapter(alias)
                self.assertIsInstance(adapter, AdoAdapter)

    def test_raises_for_unsupported_type(self) -> None:
        with self.assertRaises(ValueError):
            get_integration_adapter("ZEPHYR")


if __name__ == "__main__":
    unittest.main()
