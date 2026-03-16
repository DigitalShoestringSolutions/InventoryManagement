import React from "react";
import { Form, Card, Button, Alert, Container, Spinner, Row, Col, Table, ButtonGroup, OverlayTrigger, Tooltip, ToggleButton } from "react-bootstrap";
import { useMutation, useQuery, useQueryClient } from "react-query"
import { useNavigate } from "react-router-dom";
import APIBackend from '../RestAPI'
import { ListTable } from "../components/list_table";

import { NavLink } from "react-router-dom";

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))

const VIEW = { items: "items", locations: "locations", allocations: "allocations" }

export function OverviewPage({ config }) {
    const queryClient = useQueryClient()
    let [view, setView] = React.useState(VIEW.items)
    let [detailed, setDetailed] = React.useState(false)

    let url = get_url(config)
    const { isLoading: items_loading, data: items_dataset } = useQuery(
        ['item_dataset'],
        () =>
            fetch('http://' + url + '/state/by-items').then(res =>
                res.json()
            ),
        {
            enabled: view === VIEW.items,
        }
    )

    const { isLoading: locations_loading, data: locations_dataset } = useQuery(
        ['location_dataset'],
        () =>
            fetch('http://' + url + '/state/by-locations').then(res =>
                res.json()
            ),
        {
            enabled: view === VIEW.locations,
        }
    )

    const { isLoading: allocations_loading, data: allocations_dataset } = useQuery(
        ['allocation_dataset'],
        () =>
            fetch('http://' + url + '/list/allocations').then(res =>
                res.json()
            ),
        {
            enabled: view === VIEW.allocations,
        }
    )

    if (items_loading || locations_loading || allocations_loading)
        return <Container fluid="sm"><Alert variant="secondary">Loading<Spinner size="sm"></Spinner></Alert></Container>

    let fields = [

        { key: "name", label: "Item" },
        { key: "total_quantity", label: "Total Units" },
        { key: "minimum_unit", label: "Minimum Units" },
    ]

    if (config?.order_page_port) {
        fields.push({ key: "on_order", label: "On Order" })
    }

    if (config?.allocations) {
        fields.push({ key: "allocated", label: "Allocated" })
        fields.push({ key: "available", label: "Available" })
    }


    return <Card className="mt-2 rounded-bottom-0">
        <Card.Header className="sticky-top bg-body border-bottom">
            <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                <h2>Inventory</h2>
                <View config={config} view={view} setView={setView} />
            </div>
            <ButtonBar config={config} />
        </Card.Header>
        <Card.Body className="p-0">
            {view === VIEW.items
                ? <ListTable
                    dataset={items_dataset}
                    fields={fields}
                    get_warnings={(entry) => {
                        if (entry.minimum_unit === undefined || entry.minimum_unit === null)
                            return { icon: "", row_class: "" }
                        if (entry.total_quantity >= entry.minimum_unit)
                            return { icon: "", row_class: "" }
                        if ((entry.total_quantity + entry.on_order) < entry.minimum_unit)
                            return {
                                icon:
                                    <OverlayTrigger overlay={<Tooltip>Units below Minimum Limit of {entry.minimum_unit} {entry.on_order ? "even after deliver of " + entry.on_order + " units on order" : config?.order_page_port ? "and there are none on order" : ""}</Tooltip>}>
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
                : view === VIEW.locations ? <ListTable
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
                /> :
                    <AllocationListTable
                        dataset={allocations_dataset}
                    />
            }
        </Card.Body>
    </Card>
}

function View({ config, view, setView }) {
    return <span className="d-flex flex-row align-items-baseline">
        <span className="me-2">View:</span>
        <ButtonGroup className="mb-2">
            <ToggleButton
                type="radio"
                variant="outline-primary"
                value={VIEW.items}
                checked={view === VIEW.items}
                onClick={() => setView(VIEW.items)}
            >
                Items
            </ToggleButton>
            <ToggleButton
                type="radio"
                variant="outline-primary"
                value={VIEW.locations}
                checked={view === VIEW.locations}
                onClick={() => setView(VIEW.locations)}
            >
                Locations
            </ToggleButton>
            {config?.allocations && <ToggleButton
                type="radio"
                variant="outline-primary"
                value={VIEW.allocations}
                checked={view === VIEW.allocations}
                onClick={() => setView(VIEW.allocations)}
            >
                Allocations
            </ToggleButton>
            }
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
        {config?.order_page_port ?
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
            :
            <Button
                variant="outline-primary"
                className="bi bi-plus-circle"
                onClick={() => navigate("/new-stock")}
            >{" "}New Stock</Button>
        }
        {config?.allocations &&
            <Button
                variant="outline-primary"
                className="bi bi-box-seam"
                onClick={() => navigate("/allocate")}
            >{" "}Allocations</Button>
        }
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
        {/* <Button
            variant="outline-primary"
            className="bi bi-clipboard-data"
            onClick={() => navigate("/analytics")}
        >{" "}Analytics</Button> */}
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
            <col span="1" style={{ width: "24px" }} />
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

function AllocationListTable({ dataset }) {

    if (dataset === undefined || dataset === null)
        return ""
    console.log(dataset)
    return <Table borderless size="sm" className="p-0 m-0">
        <colgroup>
            <col span="1" style={{ width: "40%" }} />
            <col span="1" style={{ width: "30%" }} />
            <col span="1" style={{ width: "10%" }} />
            <col span="1" style={{ width: "10%" }} />
            <col span="1" style={{ width: "10%" }} />
        </colgroup>
        <thead>
            <tr>
                <th>Allocation</th>
                <th>Item</th>
                <th># Allocated</th>
                <th># Fulfilled</th>
                <th># Remaining</th>
            </tr>
        </thead>
        <tbody>
            {dataset.map(entry => {
                let allocation_reference = <td rowSpan={entry?.allocated_items?.length ?? 0}><NavLink className="link-primary link-underline link-underline-opacity-0 link-underline-opacity-75-hover" to={"/allocate?allocation=" + entry?.reference} >{entry?.reference}</NavLink></td>

                return <React.Fragment key={entry?.reference}>
                    {entry?.allocated_items.map((item_entry, index) => {
                        let complete = item_entry.remaining <= 0

                        return <React.Fragment key={item_entry.id}>
                            <tr className={complete ? "table-success" : ""}>
                                {index == 0 ? allocation_reference : ""}
                                <td>{item_entry?.item_name}</td>
                                <td>{item_entry?.allocated_quantity}</td>
                                <td>{item_entry?.fulfilled}</td>
                                <td>{item_entry?.remaining}</td>
                            </tr>
                        </React.Fragment>
                    })
                    }
                </React.Fragment>
            })}
        </tbody>
    </Table>
}

