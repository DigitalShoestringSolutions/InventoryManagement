import React from "react";
import { Form, Card, Button, Alert, Container, Spinner, Row, Col, Table, ButtonGroup, OverlayTrigger, Tooltip, ToggleButton } from "react-bootstrap";
import { useMutation, useQuery, useQueryClient } from "react-query"
import { useNavigate } from "react-router-dom";
import APIBackend from '../RestAPI'
import { ListTable } from "../components/list_table";

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))

const HIST_TYPE = { withdrawal: "withdrawal", transfer: "transfer", stock: "stock" }

export function HistoryPage({ config }) {
    const queryClient = useQueryClient()
    let [show_for, setShowFor] = React.useState(HIST_TYPE.withdrawal)

    let url = get_url(config)
    const { isLoading: withdrawal_loading, data: withdrawal_dataset } = useQuery(
        ['withdrawal_history'],
        () =>
            fetch('http://' + url + '/history/withdrawals').then(res =>
                res.json()
            ),
        {
            enabled: show_for === HIST_TYPE.withdrawal,
        }
    )

    const { isLoading: transfer_loading, data: transfer_dataset } = useQuery(
        ['transfer_history'],
        () =>
            fetch('http://' + url + '/history/transfers').then(res =>
                res.json()
            ),
        {
            enabled: show_for === HIST_TYPE.transfer,
        }
    )

    const { isLoading: stock_loading, data: stock_dataset } = useQuery(
        ['stock_history'],
        () =>
            fetch('http://' + url + '/history/new-stock').then(res =>
                res.json()
            ),
        {
            enabled: show_for === HIST_TYPE.stock,
        }
    )

    if (withdrawal_loading || transfer_loading || stock_loading)
        return <Container fluid="sm"><Alert variant="secondary">Loading<Spinner size="sm"></Spinner></Alert></Container>

    return <Card className="mt-2 rounded-bottom-0">
        <Card.Header className="sticky-top bg-body border-bottom">
            <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                <h2>History</h2>
                <ShowBar show_for={show_for} setShowFor={setShowFor} />
                <ButtonBar config={config} />
            </div>
        </Card.Header>
        <Card.Body className="p-0">
            {show_for === HIST_TYPE.withdrawal
                ? <ListTable
                    dataset={withdrawal_dataset}
                    fields={[
                        { key: "item", label: "Item" },
                        { key: "quantity", label: "Quantity" },
                        { key: "location", label: "Withdrawn From" },
                        { key: "withdrawn_by", label: "Withdrawn By" },
                        { key: "allocation_reference", label: "Allocation" },
                        { key: "date_withdrawn", label: "Timestamp" }
                    ]}
                />
                : show_for === HIST_TYPE.transfer
                    ? <ListTable
                        dataset={transfer_dataset}
                        fields={[
                            { key: "item", label: "Item" },
                            { key: "quantity", label: "Quantity" },
                            { key: "from_location", label: "From" },
                            { key: "to_location", label: "To" },
                            { key: "date_transferred", label: "Timestamp" }
                        ]}
                    /> :
                    <ListTable
                        dataset={stock_dataset}
                        fields={[
                            { key: "item", label: "Item" },
                            { key: "quantity", label: "Quantity" },
                            { key: "location", label: "Location" },
                            { key: "date_added", label: "Timestamp" }
                        ]}
                    />
            }
        </Card.Body>
    </Card>
}

function ShowBar({ show_for, setShowFor }) {
    return <span className="d-flex flex-row align-items-baseline">
        <span className="me-2">History of:</span>
        <ButtonGroup className="mb-2">
            <ToggleButton
                type="radio"
                variant="outline-primary"
                value={HIST_TYPE.withdrawal}
                checked={show_for === HIST_TYPE.withdrawal}
                onClick={() => setShowFor(HIST_TYPE.withdrawal)}
            >
                Withdrawals
            </ToggleButton>
            <ToggleButton
                type="radio"
                variant="outline-primary"
                value={HIST_TYPE.transfer}
                checked={show_for === HIST_TYPE.transfer}
                onClick={() => setShowFor(HIST_TYPE.transfer)}
            >
                Transfers
            </ToggleButton>
            <ToggleButton
                type="radio"
                variant="outline-primary"
                value={HIST_TYPE.stock}
                checked={show_for === HIST_TYPE.stock}
                onClick={() => setShowFor(HIST_TYPE.stock)}
            >
                Added Stock
            </ToggleButton>
        </ButtonGroup>
    </span>
}

function ButtonBar({ config }) {
    const navigate = useNavigate();
    return <ButtonGroup className="d-flex flex-row align-items-baseline justify-content-center flex-wrap">
        <Button
            variant="outline-primary"
            className="bi bi-arrow-left"
            onClick={() => navigate("/")}
        >{" "}Back</Button>
    </ButtonGroup>
}