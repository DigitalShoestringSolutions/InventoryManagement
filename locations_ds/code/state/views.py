from django.db.models import Q
from django.http import HttpResponse
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import (
    action,
    api_view,
    permission_classes,
    renderer_classes,
)
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from rest_framework.response import Response
from rest_framework_csv.renderers import CSVRenderer
import datetime
import dateutil.parser
from state.actions import TransferType, do_transfer

from .models import Edge, Event, Node
from .serializers import StateSerializer, EventSerializer


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def stateForAll(request):
    at = request.GET.get("t", None)
    q = Q(end__isnull=True) & ~Q(quantity=0)

    if at:
        print(f"get all at {at}")
        at_dt = dateutil.parser.isoparse(at)  # parse "at" to datetime
        q = (q | Q(end__gte=at_dt)) & Q(start__lte=at_dt)
    qs = Edge.objects.filter(q).order_by("-start")
    serializer = StateSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def stateForChild(request, item_id):
    at = request.GET.get("t", None)
    q = Q(end__isnull=True)
    node_type, node_id = Node.parse_combined_id(item_id)

    if at:
        print(f"get all at {at}")
        at_dt = dateutil.parser.isoparse(at)  # parse "at" to datetime
        q = (q | Q(end__gte=at_dt)) & Q(start__lte=at_dt)

    if node_id != "":
        q = q & Q(child__id=node_id)

    q = q & Q(child__type__key=node_type)

    qs = Edge.objects.filter(q).order_by("-start")
    serializer = StateSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def stateAtParent(request, location_link):
    at = request.GET.get("t", None)
    q = Q(end__isnull=True)
    node_type, node_id = Node.parse_combined_id(location_link)

    if at:
        print(f"get all at {at}")
        at_dt = dateutil.parser.isoparse(at)  # parse "at" to datetime
        q = (q | Q(end__gte=at_dt)) & Q(start__lte=at_dt)

    if node_id != "":
        q = q & Q(parent__id=node_id)

    q = q & Q(parent__type__key=node_type)

    qs = Edge.objects.filter(q).order_by("-start")
    serializer = StateSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def stateForChildAtParent(request, item_id, location_link):
    at = request.GET.get("t", None)
    q = Q(end__isnull=True)
    child_node_type, child_node_id = Node.parse_combined_id(item_id)
    parent_node_type, parent_node_id = Node.parse_combined_id(location_link)

    if at:
        print(f"get all at {at}")
        at_dt = dateutil.parser.isoparse(at)  # parse "at" to datetime
        q = (q | Q(end__gte=at_dt)) & Q(start__lte=at_dt)

    if child_node_id != "":
        q = q & Q(child__id=child_node_id)

    if parent_node_id != "":
        q = q & Q(parent__id=parent_node_id)

    q = q & Q(parent__type__key=parent_node_type, child__type__key=child_node_type)

    qs = Edge.objects.filter(q).order_by("-start")
    serializer = StateSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def historyAll(request):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"history {t_start}>{t_end}")

    q = Q()

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(end__gte=start_dt) | Q(end__isnull=True)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(start__lte=end_dt)

    qs = Edge.objects.filter(q).order_by("-start")
    serializer = StateSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def historyFor(request, item_id):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"history {t_start}>{t_end}")
    node_type, node_id = Node.parse_combined_id(item_id)

    q = Q()

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(end__gte=start_dt) | Q(end__isnull=True)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(start__lte=end_dt)

    if node_id != "":
        q = q & Q(child__id=node_id)

    q = q & Q(child__type__key=node_type)

    qs = Edge.objects.filter(q).order_by("-start")
    serializer = StateSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def historyAt(request, location_link):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"history {t_start}>{t_end}")
    node_type, node_id = Node.parse_combined_id(location_link)

    q = Q()

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(end__gte=start_dt) | Q(end__isnull=True)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(start__lte=end_dt)

    if node_id != "":
        q = q & Q(parent__id=node_id)

    q = q & Q(parent__type__key=node_type)

    qs = Edge.objects.filter(q).order_by("-start")
    serializer = StateSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def getAllEvents(request):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"all events {t_start}>{t_end}")

    q = Q()

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(timestamp__gte=start_dt)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(timestamp__lte=end_dt)

    qs = Event.objects.filter(q).order_by("-timestamp")
    serializer = EventSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def eventsForChild(request, item_id):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"all events {t_start}>{t_end}")
    node_type, node_id = Node.parse_combined_id(item_id)

    q = Q(child__type__key=node_type, child__id=node_id)

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(timestamp__gte=start_dt)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(timestamp__lte=end_dt)

    qs = Event.objects.filter(q).order_by("-timestamp")
    serializer = EventSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def eventsToParent(request, location_link):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"all events {t_start}>{t_end}")

    node_type, node_id = Node.parse_combined_id(location_link)

    if node_id != "":
        parent = Node.objects.get(id=node_id, type__key=node_type)
        q = Q(to_parent=parent)
    else:
        q = Q(to_parent__type=node_type)

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(timestamp__gte=start_dt)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(timestamp__lte=end_dt)

    qs = Event.objects.filter(q).order_by("-timestamp")
    serializer = EventSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def eventsFromParent(request, location_link):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"all events {t_start}>{t_end}")

    node_type, node_id = Node.parse_combined_id(location_link)

    if node_id != "":
        parent = Node.objects.get(id=node_id, type__key=node_type)
        q = Q(from_parent=parent)
    else:
        q = Q(from_parent__type=node_type)

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(timestamp__gte=start_dt)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(timestamp__lte=end_dt)

    qs = Event.objects.filter(q).order_by("-timestamp")
    serializer = EventSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def eventsAtParent(request, location_link):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"all events {t_start}>{t_end}")

    node_type, node_id = Node.parse_combined_id(location_link)

    if node_id != "":
        parent = Node.objects.get(id=node_id, type__key=node_type)
        q = Q(to_parent=parent) | Q(from_parent=parent)
    else:
        q = Q(to_parent__type=node_type) | Q(from_parent__type=node_type)

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(timestamp__gte=start_dt)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(timestamp__lte=end_dt)

    qs = Event.objects.filter(q).order_by("-timestamp")
    serializer = EventSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("GET",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer, CSVRenderer))
def eventsBetweenParents(request, from_parent, to_parent):
    t_start = request.GET.get("from", None)
    t_end = request.GET.get("to", None)
    print(f"all events {t_start}>{t_end}")

    from_node_type, from_node_id = Node.parse_combined_id(from_parent)
    to_node_type, to_node_id = Node.parse_combined_id(to_parent)

    q = Q()

    if from_node_id != "":
        from_parent = Node.objects.get(id=from_node_id, type__key=from_node_type)
        q = q & Q(from_parent=from_parent)
    else:
        q = q & Q(from_parent__type=from_node_type)

    if to_node_id != "":
        to_parent = Node.objects.get(id=to_node_id, type__key=to_node_type)
        q = q & Q(to_parent=to_parent)
    else:
        q = q & Q(to_parent__type=to_node_type)

    if t_start:
        start_dt = dateutil.parser.isoparse(t_start)
        q = q & Q(timestamp__gte=start_dt)

    if t_end:
        end_dt = dateutil.parser.isoparse(t_end)
        q = q & Q(timestamp__lte=end_dt)

    qs = Event.objects.filter(q).order_by("-timestamp")
    serializer = EventSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(("POST",))
@renderer_classes((JSONRenderer, BrowsableAPIRenderer))
def transferRequest(request):
    result, event = do_transfer(request.data)
    transfer_type, *states = result
    
    event_serializer = EventSerializer(event)

    if transfer_type == TransferType.INDIVIDUAL:
        prevState, newState = states
        transitions = []
        if prevState:
            exited_msg = {
                "child": prevState.child,
                "parent": prevState.parent,
                "timestamp": prevState.end.isoformat(),
                "event": "exited",
            }
            transitions.append(exited_msg)
        entered_msg = {
            "child": prevState.child,
            "parent": newState.parent,
            "timestamp": newState.start.isoformat(),
            "event": "entered",
        }
        transitions.append(entered_msg)


        return Response({"event": event_serializer.data, "transitions": transitions})

    elif transfer_type == TransferType.COLLECTION:
        newFromState, newToState = states
        serializer = StateSerializer([newFromState, newToState], many=True)
        return Response(
            {"event": event_serializer.data, "states": serializer.data}
        )
