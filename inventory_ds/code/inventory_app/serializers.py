from rest_framework import serializers
from django.db import transaction

from . import models
from . import utils

class LocationLimitSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="location_id")
    class Meta:
        model = models.LocationLimit
        fields = ["id","minimum_unit"]

    def to_representation(self, instance):
        output = super().to_representation(instance)
        output["name"] = utils.get_name(instance.location_id)
        return output


class ItemSerializer(serializers.ModelSerializer):
    location_limits = LocationLimitSerializer(many=True)
    class Meta:
        model = models.InventoryItem
        fields = ["id", "quantity_per_unit", "minimum_unit", "location_limits"]

    def to_representation(self, instance):
        output = super().to_representation(instance)
        output["name"] = utils.get_name(instance.id)
        return output

    def update(self, item_instance, validated_data):
        print(validated_data)
        item_instance.quantity_per_unit = validated_data["quantity_per_unit"]
        item_instance.minimum_unit = validated_data["minimum_unit"]
        item_instance.save()

        updated_limits = validated_data["location_limits"]
        print(updated_limits)
        existing_limits = {entry.location_id:entry for entry in item_instance.location_limits.all()}

        for entry in updated_limits:
            entry_location_id = entry['location_id']
            if entry_location_id in existing_limits:
                ## update
                existing_instance = existing_limits[entry_location_id]
                existing_instance.minimum_unit = entry["minimum_unit"]
                existing_instance.save()
                del existing_limits[entry_location_id]
            else:
                ## new
                models.LocationLimit.objects.create(
                    item_id=item_instance,
                    location_id=entry_location_id,
                    minimum_unit=entry["minimum_unit"],
                )
                
        for entry in existing_limits.values():
            entry.delete()

        return item_instance
