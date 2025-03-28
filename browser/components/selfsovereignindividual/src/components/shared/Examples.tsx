import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  TableContainer,
  Table,
  Text,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Icon,
  HStack,
} from "@chakra-ui/react";
import { DefaultExcludedKindList } from "../nostr/contants";
import { MdHelp } from "./react-icons/Icons";
import { ProtocolName } from "src/custom.type";

export function ExampleUrlMatch(props: {
  width?: string;
  backgroundColor?: string;
}) {
  return (
    <Accordion
      allowToggle
      width={props.width || "100%"}
      backgroundColor={props.backgroundColor ?? "transparent"}
    >
      <AccordionItem css={{ border: "none" }}>
        <AccordionButton>
          <HStack as="span" flex="1" textAlign="left">
            <Icon as={MdHelp} />
            <Text>Examples</Text>
          </HStack>
          <AccordionIcon />
        </AccordionButton>
        <AccordionPanel pb={4}>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>characters</Th>
                  <Th>match</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>*</Td>
                  <Td>all urls</Td>
                </Tr>
                <Tr>
                  <Td>&lt;all_urls&gt;</Td>
                  <Td>all urls</Td>
                </Tr>
                <Tr>
                  <Td>http*://*.example.com</Td>
                  <Td>
                    http://example.com, https://www.example.com,
                    https://sub.example.com/path?query=value,...
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

export function ExplainMethod(props: {
  width?: string;
  protocolName: ProtocolName;
}) {
  return (
    <Accordion allowToggle width={props.width || "100%"}>
      <AccordionItem css={{ border: "none" }}>
        <AccordionButton>
          <HStack as="span" flex="1" textAlign="left">
            <Icon as={MdHelp} />
            <Text>Explanation</Text>
          </HStack>
          <AccordionIcon />
        </AccordionButton>
        <AccordionPanel pb={4}>
          <Text>
            Checking &ldquo;[method]&ldquo; is skipping both of confirm dialog
            and password dialog.
            <br />
            Checking &ldquo;[method]-passwordOnly&ldquo; is skipping confirm
            dialog and prompting password dialog alone.
          </Text>
          {props.protocolName === "nostr" && (
            <Text>
              This has lower priority than the excluded kinds above., so if both
              are present, authorization will proceed.
            </Text>
          )}
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

export function ExampleNostrKind(props: { width?: string }) {
  return (
    <Accordion allowToggle width={props.width || "100%"}>
      <AccordionItem css={{ border: "none" }}>
        <AccordionButton>
          <HStack as="span" flex="1" textAlign="left">
            <Icon as={MdHelp} />
            <Text>Examples</Text>
          </HStack>
          <AccordionIcon />
        </AccordionButton>
        <AccordionPanel pb={4}>
          <Text size="sm">Default Set</Text>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Kind</Th>
                  <Th>NIP</Th>
                  <Th>Name</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(DefaultExcludedKindList).map(
                  ([kind, value], i) => {
                    return (
                      <Tr key={i}>
                        <Td>{kind}</Td>
                        <Td>{value.nip}</Td>
                        <Td>{value.name}</Td>
                      </Tr>
                    );
                  }
                )}
              </Tbody>
            </Table>
          </TableContainer>
          <Text size="sm">
            Reference:
            https://github.com/nostr-protocol/nips?tab=readme-ov-file#event-kinds
          </Text>
          <Text size="sm">
            Note: App can arbitrarily enforce your authorization even if you
            opt-out here. It&apos;s because they deemed that authorization
            important enough to ask for your consent.
          </Text>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
