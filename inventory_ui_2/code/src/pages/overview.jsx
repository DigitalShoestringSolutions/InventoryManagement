import React from "react";
import { Form, Card, Button, Alert, Container, Spinner, Row, Col, Table, ButtonGroup, OverlayTrigger, Tooltip, ToggleButton } from "react-bootstrap";
import { useMutation, useQuery, useQueryClient } from "react-query"
import { useNavigate } from "react-router-dom";
import APIBackend from '../RestAPI'
import { ListTable } from "../components/list_table";

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))

const GROUP_BY = { items: "items", locations: "locations" }

export function OverviewPage({ config }) {
    const queryClient = useQueryClient()
    let [group_by, setGroupBy] = React.useState(GROUP_BY.items)
    let [detailed, setDetailed] = React.useState(false)

    let url = get_url(config)
    const { isLoading: items_loading, data: items_dataset } = useQuery(
        ['item_dataset'],
        () =>
            fetch('http://' + url + '/state/by-items').then(res =>
                res.json()
            ),
        {
            enabled: group_by === GROUP_BY.items,
        }
    )

    const { isLoading: locations_loading, data: locations_dataset } = useQuery(
        ['location_dataset'],
        () =>
            fetch('http://' + url + '/state/by-locations').then(res =>
                res.json()
            ),
        {
            enabled: group_by === GROUP_BY.locations,
        }
    )

    if (items_loading || locations_loading)
        return <Container fluid="sm"><Alert variant="secondary">Loading<Spinner size="sm"></Spinner></Alert></Container>

    return <Card className="mt-2 rounded-bottom-0">
        <Card.Header className="sticky-top bg-body border-bottom">
            <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                <h2>Inventory</h2>
                <GroupByBar group_by={group_by} setGroupBy={setGroupBy} />
            </div>
            <ButtonBar config={config} />
        </Card.Header>
        <Card.Body className="p-0">
            {group_by === GROUP_BY.items
                ? <ListTable
                    dataset={items_dataset}
                    fields={[

                        { key: "name", label: "Item" },
                        { key: "total_quantity", label: "Total Units" },
                        { key: "minimum_unit", label: "Minimum Units" },
                        { key: "on_order", label: "On Order" }
                    ]}
                    get_warnings={(entry) => {
                        if (entry.minimum_unit === undefined || entry.minimum_unit === null)
                            return { icon: "", row_class: "" }
                        if (entry.total_quantity >= entry.minimum_unit)
                            return { icon: "", row_class: "" }
                        if ((entry.total_quantity + entry.on_order) < entry.minimum_unit)
                            return {
                                icon:
                                    <OverlayTrigger overlay={<Tooltip>Units below Minimum Limit of {entry.minimum_unit} {entry.on_order ? "even after deliver of " + entry.on_order + " units on order" : "and there are none on order"}</Tooltip>}>
                                        <i className="bi bi-exclamation-triangle-fill" />
                                    </OverlayTrigger>,
                                row_class: "table-danger"
                            }
                        else
                            return {
                                icon:
                                    <OverlayTrigger overlay={<Tooltip>Available units below Minimum Limit of {entry.minimum_unit}</Tooltip>}>
                                        <i className="bi bi-exclamation-lg" />
                                    </OverlayTrigger>,
                                row_class: "table-warning"
                            }
                    }}
                    nested={[
                        {
                            key: "locations",
                            label: "Units at Location",
                            element: LocationListTable
                        }
                    ]}
                />
                : <ListTable
                    dataset={locations_dataset}
                    fields={[
                        { key: "name", label: "Location" },
                    ]}
                    nested={[
                        {
                            key: "items",
                            label: "Items",
                            element: ItemListTable
                        }
                    ]}
                />}
        </Card.Body>
    </Card>
}

function GroupByBar({ group_by, setGroupBy }) {
    return <span className="d-flex flex-row align-items-baseline">
        <span className="me-2">Group By:</span>
        <ButtonGroup className="mb-2">
            <ToggleButton
                type="radio"
                variant="outline-primary"
                value={GROUP_BY.items}
                checked={group_by === GROUP_BY.items}
                onClick={() => setGroupBy(GROUP_BY.items)}
            >
                Items
            </ToggleButton>
            <ToggleButton
                type="radio"
                variant="outline-primary"
                value={GROUP_BY.locations}
                checked={group_by === GROUP_BY.locations}
                onClick={() => setGroupBy(GROUP_BY.locations)}
            >
                Locations
            </ToggleButton>
        </ButtonGroup>
    </span>
}

function ButtonBar({ config }) {
    const navigate = useNavigate();
    return <ButtonGroup className="d-flex flex-row align-items-baseline justify-content-center flex-wrap">
        <Button
            variant="outline-primary"
            className="bi bi-basket"
            onClick={() => navigate("/withdraw")}
        >{" "}Withdraw</Button>
        <Button
            variant="outline-primary"
            className="bi bi-arrow-left-right"
            onClick={() => navigate("/transfer")}
        >{" "}Transfer</Button>
        <Button
            variant="outline-primary"
            className="bi bi-truck"
            onClick={() => {
                let base_url = window.location.protocol + "//" + window.location.hostname + ":" + config.order_page_port
                const searchParams = new URLSearchParams();
                searchParams.append("return", window.location.href)
                window.location.assign(base_url + "?" + searchParams.toString())
            }}
        >{" "}Orders</Button>
        <Button
            variant="outline-primary"
            className="bi bi-graph-down-arrow"
            onClick={() => navigate("/admin")}
        >{" "}Manage Minimums</Button>
        <Button
            variant="outline-primary"
            className="bi bi-clock-history"
            onClick={() => navigate("/history")}
        >{" "}History</Button>
        <Button
            variant="outline-primary"
            className="bi bi-clipboard-data"
            onClick={() => navigate("/analytics")}
        >{" "}Analytics</Button>
    </ButtonGroup>
}

// TODO : highlighting of rows 
function LocationListTable({ data }) {
    return <Table borderless size="sm" className="p-0 m-0">
        <colgroup>
            <col span="1" style={{ width: "10px" }} />
            <col span="1" style={{ width: "70%" }} />
            <col span="1" style={{ width: "30%" }} />
        </colgroup>
        <tbody>
            {data.map(location => {
                let below_limit = location.quantity < location.minimum_unit

                let icon = ""
                if (below_limit) {
                    icon = <OverlayTrigger overlay={<Tooltip>Units below location minimum of {location.minimum_unit} </Tooltip>}>
                        <i className="bi bi-exclamation-lg" />
                    </OverlayTrigger>
                }

                return <React.Fragment key={location.id}>
                    <tr className={below_limit ? "table-warning" : ""}>
                        <td>{icon}</td>
                        <td>{location.name}</td>
                        <td>{location.quantity}</td>
                    </tr>
                </React.Fragment>
            })}
        </tbody>
    </Table>
}

function ItemListTable({ data }) {
    return <Table borderless size="sm" className="p-0 m-0">
        <colgroup>
            <col span="1" style={{ width: "10px" }} />
            <col span="1" style={{ width: "70%" }} />
            <col span="1" style={{ width: "30%" }} />
        </colgroup>
        <tbody>
            {data.map(item => {
                let below_limit = item.quantity < item.minimum_unit

                let icon = ""
                if (below_limit) {
                    icon = <OverlayTrigger overlay={<Tooltip>Units below location minimum of {item.minimum_unit} </Tooltip>}>
                        <i className="bi bi-exclamation-lg" />
                    </OverlayTrigger>
                }

                return <React.Fragment key={item.id}>
                    <tr className={below_limit ? "table-warning" : ""}>
                        <td>{icon}</td>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                    </tr>
                </React.Fragment>
            })}
        </tbody>
    </Table>
}
